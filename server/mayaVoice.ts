export const FAL_MAYA_STREAM_ENGINE = 'fal_maya_stream';
export const FAL_MAYA_STREAM_ENDPOINT = 'fal-ai/maya/stream';
export const FAL_MAYA_SAMPLE_RATE = 24_000;

type MayaPersona = {
  name?: string;
  niche?: string;
  tone?: string;
  bio?: string;
  gender?: string;
  voicePrompt?: string;
  voiceSpeakingSpeed?: number;
};

function inferAdultVoice(persona?: MayaPersona): string {
  const identity = [persona?.gender, persona?.name, persona?.bio, persona?.voicePrompt].filter(Boolean).join(' ').toLowerCase();
  if (/\b(?:man|male|masculine|guy|boyfriend)\b/.test(identity)) {
    return 'adult man in his late 20s to mid 30s';
  }
  return 'adult woman in her late 20s to mid 30s';
}

export function buildMayaVoicePrompt(persona?: MayaPersona): string {
  const adultVoice = inferAdultVoice(persona);
  const personaTone = String(persona?.tone || '').replace(/\s+/g, ' ').trim().slice(0, 220);
  const savedVoicePrompt = String(persona?.voicePrompt || '').replace(/\s+/g, ' ').trim().slice(0, 320);
  const tone = personaTone
    ? `Personality and emotional tone: ${personaTone}.`
    : 'Personality and emotional tone: warm, confident, playful, and emotionally responsive.';
  const pace = typeof persona?.voiceSpeakingSpeed === 'number' && persona.voiceSpeakingSpeed < 45
    ? 'Use a relaxed, unhurried conversational pace.'
    : typeof persona?.voiceSpeakingSpeed === 'number' && persona.voiceSpeakingSpeed > 65
      ? 'Use a lively but still natural conversational pace.'
      : 'Use natural conversational pacing.';

  return [
    `Realistic ${adultVoice}.`,
    savedVoicePrompt ? `Saved voice identity: ${savedVoicePrompt}.` : '',
    `Warm intimate timbre, close-mic sound, ${pace.toLowerCase()} Spontaneous emotional reactions.`,
    tone,
    'Use natural breaths, subtle micro-pauses, varied rhythm, and restrained emotion that fits the words.',
    'Never sound like an announcer, audiobook narrator, customer-service agent, or theatrical performer.',
  ].filter(Boolean).join(' ');
}

export function shapeMayaSpeechText(text: string, persona?: MayaPersona): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean || /^<(?:whisper|chuckle|giggle|curious)>/i.test(clean)) return clean;

  const spokenWords = clean.toLowerCase();
  if (/\b(?:whisper|come closer|intimate|sensual|erotic|desire|kiss|touch)\b/.test(spokenWords)) {
    return `<whisper> ${clean}`;
  }
  if (/\b(?:laugh|funny|teas(?:e|ing)|kidding|joke)\b/.test(spokenWords)) {
    return `<chuckle> ${clean}`;
  }
  if (clean.endsWith('?')) return `<curious> ${clean}`;
  return clean;
}

function decodeHex(value: string): Uint8Array | undefined {
  if (!value || value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value)) return undefined;
  return Uint8Array.from(Buffer.from(value, 'hex'));
}

export function extractFalPcmChunk(event: unknown): Uint8Array | undefined {
  if (event instanceof Uint8Array) return event;
  if (typeof event === 'string') return decodeHex(event);
  if (!event || typeof event !== 'object') return undefined;

  const audio = (event as { audio?: unknown }).audio;
  if (audio instanceof Uint8Array) return audio;
  if (typeof audio === 'string') return decodeHex(audio);
  return undefined;
}
