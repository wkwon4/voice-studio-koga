export function speechRequest(section,voice,model) {
 return {model,store:false,input:[{type:'user_input',content:[{type:'text',text:section.text,annotations:[{type:'speech_metadata',style:section.style||'Natural, clear narration'}]}]}],response_format:{type:'audio',mime_type:'audio/wav',sample_rate:24000},generation_config:{speech_config:[{voice}]}};
}
export function extractAudio(result) {
 if(result.output_audio?.data) return result.output_audio.data;
 for(const item of result.steps||result.outputs||[]) {if(item.type==='audio'&&item.data)return item.data;for(const c of item.content||[])if(c.type==='audio'&&c.data)return c.data;}
 throw Error('Gemini returned no audio. Try this section again.');
}
