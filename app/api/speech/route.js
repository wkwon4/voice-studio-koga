import {speechRequest,sceneSpeechRequest,extractAudio} from '../../../lib/gemini.js';
import {SCENE_MAX_TEXT,SCENE_MAX_TURNS} from '../../../lib/generation.js';
import {pcmToWav,readWav} from '../../../lib/wav.js';
import {accessStatus} from '../../../lib/auth.js';
import {isElevenLabsVoiceId} from '../../../lib/elevenlabs.js';
import {validateGeminiVoices} from '../../../lib/gemini-voices.js';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request) {
 const access=accessStatus(request);if(access!==200)return Response.json({error:'Private studio access required.'},{status:access});
 const origin=request.headers.get('origin');
 let sameOrigin=false;try{const source=new URL(origin);sameOrigin=source.host===request.headers.get('host')&&['http:','https:'].includes(source.protocol);}catch{}
 if(!sameOrigin) return Response.json({error:'Same-origin request required.'},{status:403});
 if(Number(request.headers.get('content-length')||0)>16000) return Response.json({error:'Section too large.'},{status:413});
 try {
  const raw=await request.text();if(raw.length>16000)throw Error('Section too large.');const {text,style='',voice,turns,provider='gemini'}=JSON.parse(raw);
  if(!['gemini','elevenlabs'].includes(provider))return Response.json({error:'Unknown voice provider.'},{status:400});
  const elevenLabs=provider==='elevenlabs';
  if(elevenLabs&&turns!==undefined)return Response.json({error:'ElevenLabs uses line generation.'},{status:400});
  if(turns!==undefined){
   if(!Array.isArray(turns)||turns.length<2||turns.length>SCENE_MAX_TURNS||turns.some(t=>!t||typeof t.text!=='string'||!t.text.trim()||typeof t.style!=='string'||t.style.length>300||typeof t.speaker!=='string'||!t.speaker.trim()||t.speaker.length>80)||turns.reduce((sum,t)=>sum+t.text.length,0)>SCENE_MAX_TEXT)
    return Response.json({error:'Invalid scene. Try generating by line.'},{status:400});
   const cast=new Map(turns.map(t=>[t.speaker,t.voice]));
   if(cast.size>2||turns.some(t=>cast.get(t.speaker)!==t.voice))return Response.json({error:'A scene can have up to two speakers, each with one voice.'},{status:400});
  }else
  if(typeof text!=='string'||!text.trim()||text.length>2500||typeof style!=='string'||style.length>300||(elevenLabs&&!isElevenLabsVoiceId(voice)))return Response.json({error:'Invalid text, delivery or voice.'},{status:400});
  if(!elevenLabs){
   try{
    if(!await validateGeminiVoices(turns?turns.map(turn=>turn.voice):[voice]))return Response.json({error:'Gemini voice is unavailable in this project. Load the voice library and choose an available voice.'},{status:400});
   }catch{return Response.json({error:'Could not verify the selected Gemini voice. Try loading the voice library again.'},{status:502});}
  }
  let audio;
  if(process.env.TTS_DEMO==='true'&&process.env.NODE_ENV!=='production') {const pcm=new Uint8Array(12000);const v=new DataView(pcm.buffer);for(let i=0;i<6000;i++)v.setInt16(i*2,Math.sin(i*2*Math.PI*440/24000)*1800,true);audio=pcmToWav(pcm);}
  else {
   const keyName=elevenLabs?'ELEVENLABS_API_KEY':'GEMINI_API_KEY';
   const key=process.env[keyName];
   const providerName=elevenLabs?'ElevenLabs':'Gemini';
   if(!key)return Response.json({error:`Configure ${keyName} on the server to use ${providerName}.`},{status:503});
   const model=process.env.GEMINI_TTS_MODEL||'gemini-3.8-flash-tts';
   if(!elevenLabs&&!['gemini-3.8-flash-lite-tts','gemini-3.8-flash-tts'].includes(model))throw Error('Unsupported model configuration.');
   const url=elevenLabs?`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=pcm_24000`:'https://generativelanguage.googleapis.com/v1beta/interactions';
   const body=elevenLabs?{text,model_id:process.env.ELEVENLABS_TTS_MODEL||'eleven_multilingual_v2'}:turns?sceneSpeechRequest(turns,model):speechRequest({text,style},voice,model);
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',[elevenLabs?'xi-api-key':'x-goog-api-key']:key},body:JSON.stringify(body),signal:AbortSignal.timeout(50000)});
   if(response.status===429){
    const retryAfter=response.headers.get('Retry-After');
    return Response.json({error:`${providerName} rate limit reached. Wait, then generate missing audio.`},{status:429,headers:retryAfter?{'Retry-After':retryAfter}:{}});
   }
   if(elevenLabs&&!response.ok){
    const failure=await response.json().catch(()=>null);
    const detail=failure?.detail;
    const message=typeof detail?.message==='string'?detail.message.replaceAll(key,'[redacted]').replaceAll(text,'[dialogue]').slice(0,500):'Check your credit balance, API key limits and voice access for your plan.';
    return Response.json({error:`ElevenLabs (${response.status}): ${message}`},{status:response.status===402?402:502});
   }
   if(response.status===402)return Response.json({error:`${providerName} requires payment or more credits (402). Check the credit balance and billing for the account linked to your API key.`},{status:402});
   if(!response.ok){
    const failure=await response.json().catch(()=>null);
    let detail=typeof failure?.error?.message==='string'?failure.error.message:'Check the model configuration and request format.';
    detail=detail.replaceAll(key,'[redacted]');
    for(const turn of turns||[{text,style}]){
     if(turn.text)detail=detail.replaceAll(turn.text,'[dialogue]');
     if(turn.style)detail=detail.replaceAll(turn.style,'[delivery]');
    }
    return Response.json({error:`Gemini (${response.status}): ${detail.slice(0,700)}`},{status:response.status===400?400:502});
   }
   if(elevenLabs){
    const pcm=new Uint8Array(await response.arrayBuffer());
    if(!pcm.length||pcm.length%2||/json|mpeg|wav|html/i.test(response.headers.get('Content-Type')||''))throw Error('Invalid PCM audio.');
    audio=pcmToWav(pcm);
   }else{
    const result=await response.json();
    if(result.status&&result.status!=='completed')return Response.json({error:'Gemini returned incomplete audio. Try a shorter section or generate by line.'},{status:502});
    audio=new Uint8Array(Buffer.from(extractAudio(result),'base64'));readWav(audio);
   }
  }
  return new Response(audio,{headers:{'Content-Type':'audio/wav','Cache-Control':'no-store','X-Studio-Demo':String(process.env.TTS_DEMO==='true'&&process.env.NODE_ENV!=='production')}});
 }catch(e){return Response.json({error:e.name==='TimeoutError'?'Generation timed out. Retry a shorter section.':e instanceof SyntaxError?'Invalid request.':'Unable to generate valid audio. Check the section and server configuration.'},{status:502});}
}
