import {accessStatus} from '../../../lib/auth.js';
import {buildParseRequest,extractParseResult} from '../../../lib/ai-parser.js';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request) {
 const access=accessStatus(request);if(access!==200)return Response.json({error:'Private studio access required.'},{status:access});
 try{if(new URL(request.headers.get('origin')).host!==request.headers.get('host'))throw Error();}catch{return Response.json({error:'Same-origin request required.'},{status:403});}
 if(Number(request.headers.get('content-length')||0)>250000)return Response.json({error:'Script too large.'},{status:413});
 let script;try{const raw=await request.text();if(raw.length>65000)return Response.json({error:'Script too large.'},{status:413});script=JSON.parse(raw).script;}catch{return Response.json({error:'Invalid request.'},{status:400});}
 if(typeof script!=='string'||!script.trim()||script.length>60000)return Response.json({error:'Enter a script of 1–60,000 characters.'},{status:400});
 if(!process.env.GEMINI_API_KEY)return Response.json({error:'Configure GEMINI_API_KEY on the server to use AI parsing. Format mode works without it.'},{status:503});
 try{
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify(buildParseRequest(script,process.env.GEMINI_PARSE_MODEL||'gemini-3.1-flash-lite')),signal:AbortSignal.timeout(50000)});
  if(!response.ok)return Response.json({error:response.status===429?'AI parsing quota reached. Wait and retry, or switch to Format mode.':`AI parsing failed (${response.status}). Check model access and billing, or use Format mode.`},{status:502});
  return Response.json(extractParseResult(await response.json(),script),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e.name==='TimeoutError'?'AI parsing timed out. Try a shorter script or Format mode.':'AI could not return valid, verbatim sections. Try again or use Format mode.'},{status:502});}
}
