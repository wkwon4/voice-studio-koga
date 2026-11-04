import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../app/api/speech/route.js';
import {readWav} from '../lib/wav.js';
const request=(body,origin='http://localhost:3000')=>new Request('http://localhost:3000/api/speech',{method:'POST',headers:{origin,host:'localhost:3000','Content-Type':'application/json'},body:JSON.stringify(body)});
test('speech route guards origin and inputs, produces playable demo WAV, hides key absence',async()=>{
 process.env.TTS_DEMO='true';
 assert.equal((await POST(request({text:'Hello',voice:'Kore'},'https://elsewhere.example'))).status,403);
 assert.equal((await POST(request({text:'Hello',voice:'fake'}))).status,400);
 const res=await POST(request({text:'Hello',voice:'Kore'}));assert.equal(res.status,200);assert.equal(readWav(await res.arrayBuffer()).length,12000);
 process.env.TTS_DEMO='false';delete process.env.GEMINI_API_KEY;
 assert.equal((await POST(request({text:'Hello',voice:'Kore'}))).status,503);
});
