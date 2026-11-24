// Gender and style hints for Gemini's 30 built-in voices, so they are easier to tell apart.
// Styles come from Google's speech-generation docs; genders are how the voices commonly sound.
export const VOICE_INFO = {
  Zephyr: ['F', 'Bright'], Puck: ['M', 'Upbeat'], Charon: ['M', 'Informative'], Kore: ['F', 'Firm'],
  Fenrir: ['M', 'Excitable'], Leda: ['F', 'Youthful'], Orus: ['M', 'Firm'], Aoede: ['F', 'Breezy'],
  Callirrhoe: ['F', 'Easy-going'], Autonoe: ['F', 'Bright'], Enceladus: ['M', 'Breathy'], Iapetus: ['M', 'Clear'],
  Umbriel: ['M', 'Easy-going'], Algieba: ['M', 'Smooth'], Despina: ['F', 'Smooth'], Erinome: ['F', 'Clear'],
  Algenib: ['M', 'Gravelly'], Rasalgethi: ['M', 'Informative'], Laomedeia: ['F', 'Upbeat'], Achernar: ['F', 'Soft'],
  Alnilam: ['M', 'Firm'], Schedar: ['M', 'Even'], Gacrux: ['F', 'Mature'], Pulcherrima: ['F', 'Forward'],
  Achird: ['M', 'Friendly'], Zubenelgenubi: ['M', 'Casual'], Vindemiatrix: ['F', 'Gentle'], Sadachbia: ['M', 'Lively'],
  Sadaltager: ['M', 'Knowledgeable'], Sulafat: ['F', 'Warm'],
};

export function voiceHint(id) {
  const info = VOICE_INFO[id];
  if (!info) return '';
  return `${info[0] === 'F' ? 'Female' : 'Male'}, ${info[1].toLowerCase()}`;
}

const STORAGE_KEY = 'koga-saved-voices';

export function loadSavedVoices() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(list) ? list.filter(v => v && typeof v.id === 'string' && typeof v.nickname === 'string') : [];
  } catch { return []; }
}

export function storeSavedVoices(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}
