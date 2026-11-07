'use client';
import {useEffect,useRef,useState} from 'react';
import {parseScript,VOICES} from '../lib/script.js';
import {planGeneration,invalidateClips,quotaDelay,waitForRetry,MAX_QUOTA_RETRIES} from '../lib/generation.js';
import {combineWavs} from '../lib/wav.js';
import {FORMAT_PROMPT} from '../lib/ai-parser.js';
const SAMPLE=`KOGA [calm, reflective]: It was supposed to be an ordinary flight.

SULLY [serious, focused]: We've lost both engines.

SKILES [alarmed, speaking quickly]: We're losing altitude!

KOGA [soft, emotional]: But what happened next… was extraordinary.`;
export default function Studio(){
 const [generationMode,setGenerationMode]=useState('line');
 const [autoRetry,setAutoRetry]=useState(false);
 const [parseMode,setParseMode]=useState('format'),[parsing,setParsing]=useState(false),[reviewed,setReviewed]=useState(true),[warnings,setWarnings]=useState([]),[copyMessage,setCopyMessage]=useState('');
 const [script,setScript]=useState(SAMPLE),[voices,setVoices]=useState({KOGA:'Charon',SULLY:'Orus',SKILES:'Puck'}),[sections,setSections]=useState([]),[clips,setClips]=useState({}),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[gap,setGap]=useState(120),[demo,setDemo]=useState(false),[ready,setReady]=useState(false);const queue=useRef(null),urls=useRef([]);
 useEffect(()=>{try{const s=localStorage.getItem('koga-script'),v=localStorage.getItem('koga-voices');if(s!==null)setScript(s);if(v)setVoices(JSON.parse(v));}catch{}setReady(true);return()=>urls.current.forEach(URL.revokeObjectURL)},[]);
 useEffect(()=>{if(ready){try{localStorage.setItem('koga-script',script);localStorage.setItem('koga-voices',JSON.stringify(voices));}catch{}}},[script,voices,ready]);
 function clearAudio(){urls.current.forEach(URL.revokeObjectURL);urls.current=[];setClips({});}
 async function parse(){setParsing(true);setBusy('Parsing script');try{let s,w=[];if(parseMode==='ai'){const res=await fetch('/api/parse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({script})});const data=await res.json();if(!res.ok)throw Error(data.error||'AI parsing failed.');s=data.sections;w=data.warnings;}else{s=parseScript(script);}clearAudio();setSections(s);setWarnings(w);setReviewed(parseMode!=='ai');setMessage(`${s.length} sections detected. ${parseMode==='ai'?'Review every speaker and check for missing dialogue before generating.':'Check voices, then generate.'}`);}catch(e){setMessage(e.message);}finally{setParsing(false);setBusy('');}}
 function switchMode(mode){setParseMode(mode);setMessage('');}
 async function copyPrompt(){try{await navigator.clipboard.writeText(FORMAT_PROMPT);setCopyMessage('Prompt copied. Paste it into your AI and replace the script placeholder.');}catch{setCopyMessage('Select the prompt below and copy it manually.');}}
 function changeScript(value){setScript(value);setSections([]);clearAudio();}
 async function generate(group, signal, label){
  const turns=group.map(s=>({speaker:s.speaker,text:s.text,style:s.style,voice:voices[s.speaker]||'Charon'}));
  const body=JSON.stringify(turns.length===1?turns[0]:{turns});
  for(let attempt=0;!signal.aborted;attempt++){
   setBusy(`Generating ${label}…`);
   const response=await fetch('/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body});
   if(response.status===429&&autoRetry&&attempt<MAX_QUOTA_RETRIES&&!signal.aborted){
    const delay=quotaDelay(response.headers.get('Retry-After'),attempt);
    setBusy(`Rate limit reached. Retrying ${label} in about ${Math.ceil(delay/1000)} seconds (${attempt+1}/${MAX_QUOTA_RETRIES}).`);
    await waitForRetry(delay,signal);
    continue;
   }
   if(!response.ok){
    const error=await response.json().catch(()=>({}));
    throw Error(error.error||'Generation failed.');
   }
   const buffer=await response.arrayBuffer();
   const url=URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}));
   urls.current.push(url);
   const ids=group.map(s=>s.id),clip={buffer,url,ids};
   setDemo(response.headers.get('X-Studio-Demo')==='true');
   setClips(old=>({...old,...Object.fromEntries(ids.map(id=>[id,clip]))}));
   return;
  }
 }
 async function run(list, retake=false){
  if(queue.current)return;
  if(!reviewed){setMessage('Review the AI sections and confirm the review checkbox first.');return;}
  const existing=retake?clips[list[0].id]:null;
  const groups=existing?[sections.filter(s=>existing.ids.includes(s.id))]:
   planGeneration(sections,new Set(list.map(s=>s.id)),!retake&&generationMode==='scene');
  if(groups.flat().some(s=>!s.text.trim()||s.text.length>2500)){
   setMessage('Each section needs 1–2,500 characters before you generate audio.');return;
  }
  const controller=new AbortController();
  queue.current=controller;
  setBusy('Starting…');setMessage('');
  try{
   for(const [i,group] of groups.entries()){
    if(controller.signal.aborted)break;
    const label=group.length===1?`section ${group[0].id}`:`sections ${group[0].id}–${group.at(-1).id}`;
    await generate(group,controller.signal,`${label} (request ${i+1}/${groups.length})`);
   }
   setMessage(controller.signal.aborted?'Stopped. Completed audio is kept.':'Audio ready. Preview your takes or download the full WAV.');
  }catch(e){setMessage(e.message+' Completed audio is kept. Generate missing to resume.');}
  finally{queue.current=null;setBusy('');}
 }
 function download(){try{const wav=combineWavs(sections.filter(s=>clips[s.id].ids[0]===s.id).map(s=>clips[s.id].buffer),gap),url=URL.createObjectURL(new Blob([wav],{type:'audio/wav'}));urls.current.push(url);const a=document.createElement('a');a.href=url;a.download='kogablox-narration.wav';a.click();}catch(e){setMessage(e.message);}}
 const speakers=[...new Set(sections.map(s=>s.speaker))],count=sections.filter(s=>clips[s.id]).length;
 return <main><header><a className="brand" href="/">K<span>◈</span>GA<span className="brand-sub">VOICE STUDIO</span></a><span className="private">● PRIVATE WORKSPACE</span></header>
 <section className="intro"><div><p className="eyebrow">KOGABLOX / AUDIO PRODUCTION</p><h1>Your story.<br/><em>Every voice.</em></h1><p className="lede">From a full script to one continuous performance.<br/>Cast your characters. Direct the delivery. Bring it to life.</p></div><div className="intro-note"><span>01 — WRITE</span><span>02 — CAST</span><span>03 — CREATE</span></div></section>
 <section className="panel parser-controls" aria-label="Parsing options"><fieldset disabled={!!busy}><legend>How should we read your script?</legend><label><input type="radio" name="parse-mode" checked={parseMode==='format'} onChange={()=>switchMode('format')}/> Format mode · no AI</label><label><input type="radio" name="parse-mode" checked={parseMode==='ai'} onChange={()=>switchMode('ai')}/> AI mode · recognize speakers</label></fieldset><p>{parseMode==='ai'?'Paste your normal script, then click Parse script. AI parsing sends it to Google, uses your API quota, and may incur charges depending on your plan. Review all results for wrong speakers or omitted dialogue.':'Use SPEAKER [delivery]: dialogue. Parsing runs in your browser with no API request.'}</p><details><summary>Need help formatting? Show a prompt for your AI</summary><p>Copy this into your preferred AI, replace the placeholder with your script, then paste its response into Format mode. Review it against your original script.</p><button className="secondary" onClick={copyPrompt}>Copy formatting prompt</button><p role="status">{copyMessage}</p><textarea aria-label="Formatting prompt" readOnly value={FORMAT_PROMPT} rows={12}/></details>{parsing&&<p role="status">Reading your script…</p>}</section>
 {!!sections.length&&!reviewed&&<section className="panel ai-review"><h2>Review AI sections</h2><p>Compare the dialogue below with your original script. Correct the speakers here; edit delivery and dialogue in the recording desk. AI can miss content even when the returned words match.</p>{warnings.map((w,i)=><p className="review-warning" key={i}>{w}</p>)}{sections.map(s=><label className="speaker-review" key={s.id}>Section {s.id}{s.uncertain?' · attribution needs checking':''}<input aria-label={`Section ${s.id} speaker`} value={s.speaker} maxLength={40} onChange={e=>{setSections(old=>old.map(x=>x.id===s.id?{...x,speaker:e.target.value.toUpperCase()}:x));setClips(old=>invalidateClips(old,[s.id]));}}/></label>)}<label className="review-confirm"><input type="checkbox" disabled={sections.some(s=>!s.speaker.trim()||s.speaker.trim()==='UNKNOWN')} checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I checked all speakers, delivery and dialogue against the original script.</label></section>}
 <div className="workspace"><section className="panel editor"><div className="panel-heading"><h2><small>01</small> The script</h2><button className="text" disabled={!!busy} onClick={()=>changeScript(SAMPLE)}>Load example</button></div><label htmlFor="script">SPEAKER [emotion, delivery]: dialogue</label><textarea id="script" value={script} disabled={!!busy} onChange={e=>changeScript(e.target.value)} spellCheck="false"/><div className="editor-bottom"><span>{script.length.toLocaleString()} characters · saved on this browser</span><button disabled={!!busy} onClick={parse}>Parse script ↗</button></div><details><summary>Script formatting</summary><p>Start every turn with a name and colon. Put delivery in square brackets after the name. Dialogue can continue on the next line. For a delivery change, start another turn. Inline vocal events such as &lt;sigh&gt; can stay in dialogue. Maximum 2,500 characters per section.</p></details></section>
 <aside className="panel cast"><h2><small>02</small> Voice cast</h2><p>One saved voice for each character.</p>{!speakers.length&&<div className="empty">Parse your script to<br/>meet the cast.</div>}{speakers.map((name,i)=><label className="voice-row" key={name}><span className="avatar">{name.slice(0,1)}</span><span>{name}<select disabled={!!busy} value={voices[name]||'Charon'} onChange={e=>{setVoices({...voices,[name]:e.target.value});setClips(old=>invalidateClips(old,sections.filter(s=>s.speaker===name).map(s=>s.id)));}}>{VOICES.map(v=><option key={v}>{v}</option>)}</select></span></label>)}<div className="cast-note">Voice choices are saved automatically. Changing a voice clears that character’s takes.</div></aside></div>
 <section className="panel timeline"><div className="panel-heading"><h2><small>03</small> Recording desk <span className="count">{count}/{sections.length} ready</span></h2><div className="actions"><button disabled={!!busy||!sections.length||count===sections.length} onClick={()=>run(sections.filter(s=>!clips[s.id]))}>{count?'Generate missing':'Generate all'} ✦</button>{busy&&!parsing&&<button onClick={()=>{queue.current?.abort();setBusy('Stopping after any active request…');}}>Stop</button>}</div></div>
 <fieldset disabled={!!busy} className="generation-options"><legend>Generation options</legend><label>Group audio by <select value={generationMode} onChange={e=>setGenerationMode(e.target.value)}><option value="line">Line</option><option value="scene">Scene</option></select></label><label><input type="checkbox" checked={autoRetry} onChange={e=>setAutoRetry(e.target.checked)}/> Automatically retry rate limits</label></fieldset>
 <p className="status">Scene mode groups nearby lines for up to two speakers into one clip. Retakes replace the whole clip. Keep this tab open and your device awake during generation.</p>{demo&&<p className="demo">DEMO MODE — synthetic test tones, not speech.</p>}<p role="status" className="status">{busy||message||'Your sections will appear here after parsing.'}</p>{busy&&<progress/>}{sections.map(s=><article className="take" key={s.id}><span className="take-number">{s.id.padStart(2,'0')}</span><div className="take-body"><div className="take-meta">{s.speaker} <span>{s.style||'Natural delivery'}</span></div><textarea aria-label={`Section ${s.id} dialogue`} disabled={!!busy} value={s.text} onChange={e=>{setSections(old=>old.map(x=>x.id===s.id?{...x,text:e.target.value}:x));setClips(old=>invalidateClips(old,[s.id]));}}/><input aria-label={`Section ${s.id} delivery`} disabled={!!busy} value={s.style} maxLength={300} placeholder="Delivery direction" onChange={e=>{setSections(old=>old.map(x=>x.id===s.id?{...x,style:e.target.value}:x));setClips(old=>invalidateClips(old,[s.id]));}}/>{clips[s.id]?.ids[0]===s.id&&<audio controls preload="none" src={clips[s.id].url}/>} {clips[s.id]?.ids.length>1&&<p className="status">Scene take · sections {clips[s.id].ids[0]}–{clips[s.id].ids.at(-1)}</p>}</div><button className="secondary" disabled={!!busy||!s.text.trim()||s.text.length>2500} onClick={()=>run([s],true)}>{clips[s.id]?.ids.length>1?'↻ Regenerate scene':clips[s.id]?'↻ Regenerate':'Generate'}</button></article>)}<footer><label>Pause between takes <select disabled={!!busy} value={gap} onChange={e=>setGap(Number(e.target.value))}>{[0,120,250,500,1000].map(n=><option key={n} value={n}>{n} ms</option>)}</select></label><button disabled={!!busy||!sections.length||count!==sections.length} onClick={download}>↓ Download full WAV</button></footer></section><p className="footnote">KOGA VOICE STUDIO · Scripts and cast stay in this browser. Audio stays in this tab until you download it. Speech generation sends dialogue to Google.</p></main>
}
