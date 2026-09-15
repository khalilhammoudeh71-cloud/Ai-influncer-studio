export interface SavedPersonaVoice {
  id: string;
  name: string;
  savedAt: string;
  updatedAt: string;
  voiceId?: string;
  voiceEngine?: string;
  voiceSampleUrl?: string;
  audioSamples?: Array<{ name: string; base64: string }>;
  voicePrompt?: string;
  voiceReferenceText?: string;
  voiceLikeness?: number;
  voiceStability?: number;
  voiceStyleExaggeration?: number;
  voiceSpeakingSpeed?: number;
  provider?: string;
  account?: string;
}

export function restoreSavedVoice(voice: SavedPersonaVoice) {
  return {
    voiceId: voice.voiceId || '',
    voiceEngine: voice.voiceEngine || '',
    voiceName: voice.name,
    voiceSampleUrl: voice.voiceSampleUrl || '',
    audioSamples: structuredClone(voice.audioSamples || []),
    voicePrompt: voice.voicePrompt || '',
    voiceReferenceText: voice.voiceReferenceText || '',
    voiceLikeness: voice.voiceLikeness ?? 85,
    voiceStability: voice.voiceStability ?? 75,
    voiceStyleExaggeration: voice.voiceStyleExaggeration ?? 20,
    voiceSpeakingSpeed: voice.voiceSpeakingSpeed ?? 1,
  };
}

// Signed playback URLs expire. The object path is the stable identity.
export function permanentVoiceReference(value: string): string {
  try {
    const url = new URL(value);
    const prefix = '/storage/v1/object/sign/workspace-media/';
    if (url.pathname.startsWith(prefix)) return `supabase-media://${decodeURIComponent(url.pathname.slice(prefix.length))}`;
  } catch { /* Already a storage reference, inline recording, or empty. */ }
  return value;
}

export function personaVoiceIdentity(voice: { voiceEngine?: string | null; voiceId?: string | null; voiceSampleUrl?: string | null; audioSamples?: any[] }) {
  const engine = voice.voiceEngine || '';
  // Hosted IDs address the voice independently of its enrollment recordings.
  const hostedId = voice.voiceId && /^(elevenlabs|eleven_|heygen|fish-audio|fishaudio)/.test(engine);
  const references = hostedId ? [] : [voice.voiceSampleUrl || '', ...(voice.audioSamples || []).map(s => typeof s === 'string' ? s : s.base64 || '')].filter(Boolean).map(permanentVoiceReference);
  return JSON.stringify([engine, voice.voiceId || '', [...new Set(references)]]);
}
