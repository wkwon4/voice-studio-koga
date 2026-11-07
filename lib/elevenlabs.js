export function isElevenLabsVoiceId(value) {
 return typeof value==='string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
}
