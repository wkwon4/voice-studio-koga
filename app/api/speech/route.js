import {VOICES} from '../../../lib/script.js';
import {speechRequest,sceneSpeechRequest,extractAudio} from '../../../lib/gemini.js';
import {SCENE_MAX_TEXT,SCENE_MAX_TURNS} from '../../../lib/generation.js';
import {pcmToWav,readWav} from '../../../lib/wav.js';
import {accessStatus} from '../../../lib/auth.js';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request) {
 const access=accessStatus(request);if(access!==200)return Response.json({error:'Private studio access required.'},{status:access});
 const origin=request.headers.get('origin');
 let sameOrigin=false;try{const source=new URL(origin);sameOrigin=source.host===request.headers.get('host')&&['http:','https:'].includes(source.protocol);}catch{}
 if(!sameOrigin) return Response.json({error:'Same-origin request required.'},{status:403});
 if(Number(request.headers.get('content-length')||0)>16000) return Response.json({error:'Section too large.'},{status:413});
 try {
  const raw=await request.text();if(raw.length>16000)throw Error('Section too large.');const {text,style='',voice,turns}=JSON.parse(raw);
  if(turns!==undefined){
   if(!Array.isArray(turns)||turns.length<2||turns.length>SCENE_MAX_TURNS||turns.some(t=>!t||typeof t.text!=='string'||!t.text.trim()||typeof t.style!=='string'||t.style.length>300||typeof t.speaker!=='string'||!t.speaker.trim()||t.speaker.length>80||!VOICES.includes(t.voice))||turns.reduce((sum,t)=>sum+t.text.length,0)>SCENE_MAX_TEXT)
    return Response.json({error:'Invalid scene. Try generating by line.'},{status:400});
   const cast=new Map(turns.map(t=>[t.speaker,t.voice]));
   if(cast.size>2||turns.some(t=>cast.get(t.speaker)!==t.voice))return Response.json({error:'A scene can have up to two speakers, each with one voice.'},{status:400});
  }else
  if(typeof text!=='string'||!text.trim()||text.length>2500||typeof style!=='string'||style.length>300||!VOICES.includes(voice))return Response.json({error:'Invalid text, delivery or voice.'},{status:400});
  let audio;
  if(process.env.TTS_DEMO==='true'&&process.env.NODE_ENV!=='production') {const pcm=new Uint8Array(12000);const v=new DataView(pcm.buffer);for(let i=0;i<6000;i++)v.setInt16(i*2,Math.sin(i*2*Math.PI*440/24000)*1800,true);audio=pcmToWav(pcm);}
  else {
   if(!process.env.GEMINI_API_KEY)return Response.json({error:'Add GEMINI_API_KEY to .env.local and restart the studio.'},{status:503});
   const model=process.env.GEMINI_TTS_MODEL||'gemini-3.8-flash-tts';
   if(!['gemini-3.8-flash-lite-tts','gemini-3.8-flash-tts'].includes(model))throw Error('Unsupported model configuration.');
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify(turns?sceneSpeechRequest(turns,model):speechRequest({text,style},voice,model)),signal:AbortSignal.timeout(50000)});
   if(response.status===429){
    const retryAfter=response.headers.get('Retry-After');
    return Response.json({error:'Gemini quota reached. Wait, then generate missing audio.'},{status:429,headers:retryAfter?{'Retry-After':retryAfter}:{}});
   }
   if(!response.ok)return Response.json({error:`Gemini request failed (${response.status}). Check model access, billing, or retry this section.`},{status:502});
   const result=await response.json();
   if(result.status&&result.status!=='completed')return Response.json({error:'Gemini returned incomplete audio. Try a shorter section or generate by line.'},{status:502});
   audio=new Uint8Array(Buffer.from(extractAudio(result),'base64'));readWav(audio);
  }
  return new Response(audio,{headers:{'Content-Type':'audio/wav','Cache-Control':'no-store','X-Studio-Demo':String(process.env.TTS_DEMO==='true'&&process.env.NODE_ENV!=='production')}});
 }catch(e){return Response.json({error:e.name==='TimeoutError'?'Generation timed out. Retry a shorter section.':e instanceof SyntaxError?'Invalid request.':'Unable to generate valid audio. Check the section and server configuration.'},{status:502});}
}
