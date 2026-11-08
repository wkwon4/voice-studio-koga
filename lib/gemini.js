export function speechRequest(section,voice,model) {
 return {model,store:false,input:[{type:'user_input',content:[{type:'text',text:section.text,annotations:[{type:'speech_metadata',style:section.style||'Natural, clear narration'}]}]}],response_format:{type:'audio',mime_type:'audio/wav',sample_rate:24000},generation_config:{speech_config:[{voice}]}};
}
export function sceneSpeechRequest(turns, model) {
 const request = speechRequest(turns[0], turns[0].voice, model);
 const voices = new Map(turns.map(turn => [turn.speaker, turn.voice]));
 const multiple = voices.size > 1;
 const labels = new Map([...voices.keys()].map((speaker, i) => [speaker, `Speaker${i + 1}`]));
 request.input[0].content = turns.map(turn => ({
  type: 'text', text: turn.text,
  annotations: [{type: 'speech_metadata', style: turn.style || 'Natural, clear narration',
   ...(multiple ? {speaker: labels.get(turn.speaker)} : {})}],
 }));
 if (multiple) request.generation_config.speech_config = {
  speakers: [...voices].map(([speaker, voice]) => ({speaker: labels.get(speaker), voice})),
 };
 return request;
}
export function extractAudio(result) {
 if(result.output_audio?.data) return result.output_audio.data;
 for(const item of result.steps||result.outputs||[]) {if(item.type==='audio'&&item.data)return item.data;for(const c of item.content||[])if(c.type==='audio'&&c.data)return c.data;}
 throw Error('Gemini returned no audio. Try this section again.');
}
