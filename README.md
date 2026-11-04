# Koga Voice Studio

Private Next.js/React script-to-speech MVP for KogaBlox. No database, paid hosting, FFmpeg, or client-side API key required. Browser storage saves the original script and character voices. Generated takes and edits made in the recording desk live in the current tab; download before closing or reparsing. Reparse discards takes. Voices may still vary across generations; matching voice IDs is not a guarantee of identical performance.

## Run locally

Install Node.js 22 LTS or newer. In this directory run `npm ci`, copy `.env.example` to `.env.local`, enter your Google AI Studio API key as `GEMINI_API_KEY`, then run `npm run dev`. Open http://127.0.0.1:3000. This binds only to your Mac. If using the included project runtime, add `$PWD/.runtime/node-v22.23.4-darwin-arm64/bin` to PATH first. Never commit `.env.local` or use a `NEXT_PUBLIC_` prefix for the key.

Get a key from https://aistudio.google.com/apikey. Restart the server after changing environment values. Optionally set `STUDIO_PASSWORD` locally; username is `koga`. Production refuses access until a password is configured. Basic authentication is intended for a single owner over HTTPS, not a multi-user service. Use a long random ASCII password and your host's access protection where available.

## Use

Paste this format, then click Parse script:

```text
KOGA [calm, reflective]: It was supposed to be an ordinary flight.
SULLY [serious, focused]: We've lost both engines.
SKILES [alarmed, speaking quickly]: We're losing altitude!
```

Speaker names are case-normalized. Dialogue continues until the next speaker header. Repeat the speaker header for delivery changes. Square-bracket directions after the name become structured style metadata and are not spoken. Inline vocal events such as `<sigh>` stay in the transcript. Unsupported or ambiguous screenplay formats require conversion to this explicit format.

Assign voices, Generate all, listen to each take, then Download full WAV. Each request generates one section; any number of characters can therefore appear across the script. Requests run sequentially. Generate missing resumes after a failure. Regenerate replaces one section. Stop finishes the current request before stopping; completed API calls can incur charges. No automatic paid retries. Download is enabled only when every section has current audio. WAV export concatenates PCM data and optional silence, not multiple WAV headers; output is 24 kHz, mono, signed 16-bit PCM. No audio normalization or crossfading in this MVP.

Limits: 60,000 script characters, 100 sections, 2,500 dialogue characters per section, 300 delivery characters, 200 MB assembled audio. Smaller sections improve responsiveness and fit serverless response limits. Browser memory limits can be lower. Use short paragraphs; export large projects in parts. Script and cast use localStorage, while generated audio remains in browser memory. There is no cloud project history or cross-device sync. Recording-desk edits are not persisted back into the original script.

## Model verification — November 4, 2026

Google's current official model and TTS documentation lists stable `gemini-3.8-flash-lite-tts` (default, lower cost) and `gemini-3.8-flash-tts` (higher fidelity). This was verified rather than inferred from the name. Set `GEMINI_TTS_MODEL` to either ID. The new Interactions API uses structured `speech_metadata` for delivery and returns complete WAV files for unary audio requests. This project explicitly requests 24 kHz WAV, sets `store: false`, and validates the returned PCM format. It does not use the legacy generateContent schema or double-wrap WAV headers.

Sources: https://ai.google.dev/gemini-api/docs/speech-generation · https://ai.google.dev/gemini-api/docs/models · https://ai.google.dev/gemini-api/docs/deprecations · https://ai.google.dev/gemini-api/docs/pricing

The pricing page lists a free tier for Flash-Lite TTS, subject to quotas and account eligibility. Paid pricing and introductory discounts can change. Free-tier content may be used to improve Google's products; paid-tier treatment differs. Review Google's terms before submitting unpublished scripts. Local development costs nothing; API use is separate. There is no spending cap implemented by this app. Configure billing limits/alerts with Google and monitor usage.

## Tests

`npm test` verifies parser behavior, metadata construction, WAV validation, segment order, silence and replacement. `npm run build` checks the production bundle. For a no-key smoke test run `TTS_DEMO=true npm run dev`; this returns clearly labelled synthetic test tones, not Gemini speech. Demo is disabled in production. Live Gemini generation and listening checks require a valid key; do not treat passing synthetic tests as proof of live API access or audio quality.

## Deployment path

Local use is the default; this project has not been published. Push this folder to a private Git repository (exclude .env files and .runtime), import into Vercel as a Next.js project, select Node 22+, and configure `GEMINI_API_KEY`, `GEMINI_TTS_MODEL`, and a strong `STUDIO_PASSWORD` as server environment variables. Deploy and open the HTTPS address using username `koga`. Confirm unauthenticated requests are challenged and test a short section before a full script. Never enable demo for deployed use. Keep dependencies updated.

Vercel Hobby permits personal/non-commercial use only. A private tool supporting monetized KogaBlox production may be commercial: use local hosting or a plan allowing commercial use (such as Vercel Pro). You can upgrade the same project later without rebuilding. See https://vercel.com/docs/plans/hobby and https://vercel.com/legal/terms. Each section uses one serverless request with a 50-second upstream timeout and a 60-second route duration. Check your selected plan's duration and payload limits; use shorter sections if necessary. Durable quotas, robust multi-user auth, background jobs and object storage are future work before broader access.
