import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseScript} from '../lib/script.js';
import {pcmToWav,readWav,combineWavs} from '../lib/wav.js';
import {speechRequest,extractAudio} from '../lib/gemini.js';
test('current Interactions REST steps expose audio',()=>{assert.equal(extractAudio({steps:[{type:'model_output',content:[{type:'audio',data:'AQI='}]}]}),'AQI=');});
test('speaker switches, delivery and multiline dialogue preserve order',()=>{
 const s=parseScript('Koga [calm]: First line\ncontinued.\n\nSully: Second.\nKoga [excited]: Third!');
 assert.deepEqual(s.map(x=>[x.speaker,x.style,x.text]),[['KOGA','calm','First line\ncontinued.'],['SULLY','','Second.'],['KOGA','excited','Third!']]);
});
test('reject ambiguous, empty and oversized sections',()=>{for(const s of ['No speaker','KOGA:',`KOGA: ${'a'.repeat(2501)}`])assert.throws(()=>parseScript(s));});
test('combine PCM payloads in order, insert silence once, replace a take',()=>{
 const a=pcmToWav(new Uint8Array([1,2,3,4])),b=pcmToWav(new Uint8Array([5,6]));
 const pcm=readWav(combineWavs([a,b],1));assert.equal(pcm.length,54);assert.deepEqual([...pcm.slice(0,4)],[1,2,3,4]);assert.deepEqual([...pcm.slice(-2)],[5,6]);assert.ok(pcm.slice(4,-2).every(x=>x===0));assert.deepEqual([...readWav(combineWavs([b,a],0))],[5,6,1,2,3,4]);
});
test('reject broken or incompatible WAV instead of corrupting export',()=>{assert.throws(()=>readWav(new Uint8Array(44)));assert.throws(()=>readWav(pcmToWav(new Uint8Array(2),16000)));assert.throws(()=>readWav(pcmToWav(new Uint8Array(2)).slice(0,44)));});
test('delivery is metadata and transcript remains verbatim',()=>{const r=speechRequest({text:'Hello <sigh>.',style:'sad'},'Kore','gemini-3.8-flash-lite-tts');assert.equal(r.input[0].content[0].text,'Hello <sigh>.');assert.equal(r.input[0].content[0].annotations[0].style,'sad');assert.equal(r.store,false);assert.equal(extractAudio({outputs:[{type:'audio',data:'AQI='}]}),'AQI=');assert.throws(()=>extractAudio({outputs:[]}));});
