export function pcmToWav(pcm, rate=24000) {
  const out=new Uint8Array(44+pcm.length),v=new DataView(out.buffer);
  const str=(n,s)=>[...s].forEach((c,i)=>v.setUint8(n+i,c.charCodeAt(0)));
  str(0,'RIFF');v.setUint32(4,36+pcm.length,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,pcm.length,true);out.set(pcm,44);return out;
}
export function readWav(input) {
  const b=new Uint8Array(input),v=new DataView(b.buffer,b.byteOffset,b.byteLength),str=(o,n)=>String.fromCharCode(...b.slice(o,o+n));
  if(b.length<44||str(0,4)!=='RIFF'||str(8,4)!=='WAVE') throw Error('Invalid WAV returned.');
  let format=false,pcm;
  for(let p=12;p+8<=b.length;){const size=v.getUint32(p+4,true),start=p+8;if(start+size>b.length) throw Error('Truncated WAV.');
    if(str(p,4)==='fmt ') {if(size<16||v.getUint16(start,true)!==1||v.getUint16(start+2,true)!==1||v.getUint32(start+4,true)!==24000||v.getUint16(start+14,true)!==16) throw Error('Expected 24 kHz mono 16-bit PCM WAV.');format=true;}
    if(str(p,4)==='data') pcm=b.slice(start,start+size);p=start+size+(size%2);
  }
  if(!format||!pcm||pcm.length%2) throw Error('WAV is missing valid PCM data.');return pcm;
}
export function combineWavs(buffers,gapMs=120) {
  if(!buffers.length) throw Error('Generate audio first.');
  const parts=buffers.map(readWav),gap=new Uint8Array(Math.round(gapMs*24)*2),size=parts.reduce((n,p)=>n+p.length,0)+gap.length*(parts.length-1);
  if(size>200*1024*1024) throw Error('Export exceeds the 200 MB MVP limit.');
  const pcm=new Uint8Array(size);let offset=0;parts.forEach((p,i)=>{pcm.set(p,offset);offset+=p.length;if(i<parts.length-1)offset+=gap.length;});return pcmToWav(pcm);
}
