import {accessStatus} from '../../../lib/auth.js';
import {listGeminiVoices} from '../../../lib/gemini-voices.js';

export const runtime = 'nodejs';

export async function GET(request) {
  const access = accessStatus(request);
  if (access !== 200) return Response.json({error: 'Private studio access required.'}, {status: access});
  const token = new URL(request.url).searchParams.get('pageToken') || '';
  if (token.length > 4096) return Response.json({error: 'Invalid catalogue page.'}, {status: 400});
  try {
    return Response.json(await listGeminiVoices(token), {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    return Response.json({error: error.name === 'TimeoutError' ? 'Voice library timed out. Try again.' : error.message}, {status: 502});
  }
}
