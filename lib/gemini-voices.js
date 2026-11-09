import {VOICES} from './script.js';

export async function listGeminiVoices(pageToken = '') {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Error('Configure GEMINI_API_KEY to load the Gemini voice library.');
  const url = new URL('https://generativelanguage.googleapis.com/v1beta/voices');
  url.searchParams.set('type', 'prebuilt');
  url.searchParams.set('page_size', '1000');
  if (pageToken) url.searchParams.set('page_token', pageToken);
  const response = await fetch(url, {
    headers: {'x-goog-api-key': key},
    next: {revalidate: 3600},
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error(`Google voice library could not load (${response.status}). Check API access and try again.`);
  const data = await response.json();
  if (!Array.isArray(data.voices)) throw Error('Google returned an invalid voice catalogue.');
  const voices = data.voices.filter(voice =>
    typeof voice.id === 'string' && voice.id.length > 0 && voice.id.length <= 200 &&
    !voice.id.startsWith('voice_') && !voice.id.startsWith('voicekey_')
  ).map(voice => ({
    id: voice.id,
    name: typeof voice.display_name === 'string' ? voice.display_name : voice.id,
    language: typeof voice.language_code === 'string' ? voice.language_code : '',
  }));
  return {voices, nextPageToken: typeof data.next_page_token === 'string' ? data.next_page_token : ''};
}

export async function validateGeminiVoices(ids) {
  if (ids.some(id => typeof id !== 'string' || !id.length || id.length > 200)) return false;
  const missing = new Set(ids.filter(id => !VOICES.includes(id)));
  if (!missing.size) return true;
  if (!process.env.GEMINI_API_KEY) return false;
  let token = '';
  const seen = new Set();
  do {
    const page = await listGeminiVoices(token);
    for (const voice of page.voices) missing.delete(voice.id);
    if (!missing.size) return true;
    token = page.nextPageToken;
    if (seen.has(token)) return false;
    seen.add(token);
  } while (token && seen.size < 10);
  return false;
}
