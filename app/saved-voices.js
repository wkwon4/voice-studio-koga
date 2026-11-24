'use client';
import {useEffect,useRef,useState} from 'react';
import {voiceHint} from '../lib/voice-info.js';

const SAMPLE_LINE='Hi! This is what my voice sounds like.';

// "Try & save voices": preview any Gemini voice, save the ones you like under a nickname.
export default function SavedVoices({options,saved,setSaved,busy}){
 const [tryVoice,setTryVoice]=useState(saved[0]?.id||'Zephyr');
 const [line,setLine]=useState(SAMPLE_LINE);
 const [playing,setPlaying]=useState('');
 const [note,setNote]=useState('');
 const cache=useRef(new Map()),audio=useRef(null);
 useEffect(()=>()=>{audio.current?.pause();cache.current.forEach(URL.revokeObjectURL);},[]);
 const savedIds=new Set(saved.map(v=>v.id));

 async function play(id){
  const text=line.trim()||SAMPLE_LINE;
  audio.current?.pause();
  setNote('');setPlaying(id);
  try{
   const key=id+'\n'+text;
   let url=cache.current.get(key);
   if(!url){
    const response=await fetch('/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({speaker:'PREVIEW',text,style:'',voice:id,provider:'gemini'})});
    if(!response.ok){const e=await response.json().catch(()=>({}));throw Error(e.error||'Preview failed.');}
    url=URL.createObjectURL(await response.blob());
    cache.current.set(key,url);
   }
   audio.current=new Audio(url);
   audio.current.onended=()=>setPlaying('');
   await audio.current.play();
  }catch(e){setNote(e.message);setPlaying('');}
 }
 function save(id){
  if(savedIds.has(id)){setNote('Already saved — rename it below.');return;}
  const hint=voiceHint(id);
  setSaved([...saved,{id,nickname:hint?`${id} (${hint.split(',')[0]})`:id}]);
  setNote('Saved! Click the name below to rename it.');
 }
 const rename=(id,nickname)=>setSaved(saved.map(v=>v.id===id?{...v,nickname}:v));
 const remove=id=>setSaved(saved.filter(v=>v.id!==id));
 const label=v=>{const hint=voiceHint(v.id);return `${v.name}${hint?` · ${hint}`:''}${v.language?` · ${v.language}`:''}`;};

 return <div className="saved-voices">
  <h3>Try &amp; save voices</h3>
  <select aria-label="Voice to try" value={tryVoice} onChange={e=>setTryVoice(e.target.value)}>
   {options.map(v=><option key={v.id} value={v.id}>{savedIds.has(v.id)?'★ ':''}{label(v)}</option>)}
  </select>
  <input aria-label="Preview line" value={line} maxLength={300} onChange={e=>setLine(e.target.value)} placeholder={SAMPLE_LINE}/>
  <div className="saved-actions">
   <button className="secondary" disabled={!!busy||!!playing} onClick={()=>play(tryVoice)}>{playing===tryVoice?'Playing…':'▶ Play'}</button>
   <button disabled={savedIds.has(tryVoice)} onClick={()=>save(tryVoice)}>{savedIds.has(tryVoice)?'★ Saved':'☆ Save voice'}</button>
  </div>
  {note&&<p role="status">{note}</p>}
  <h3>My saved voices <span>{saved.length}</span></h3>
  {!saved.length&&<p>Nothing saved yet. Try a voice above and save the ones you like.</p>}
  {saved.map(v=><div className="saved-row" key={v.id}>
   <button className="secondary icon" title="Play" disabled={!!busy||!!playing} onClick={()=>play(v.id)}>{playing===v.id?'…':'▶'}</button>
   <span><input aria-label={`Nickname for ${v.id}`} value={v.nickname} maxLength={40} onChange={e=>rename(v.id,e.target.value)} onBlur={e=>{if(!e.target.value.trim())rename(v.id,v.id);}}/><small>{v.id}{voiceHint(v.id)?` · ${voiceHint(v.id)}`:''}</small></span>
   <button className="text" title="Remove from saved" onClick={()=>remove(v.id)}>✕</button>
  </div>)}
 </div>;
}
