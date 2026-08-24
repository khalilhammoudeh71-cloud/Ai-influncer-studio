export interface ElevenLabsVoiceSummary {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

const normalizeName = (value: string): string => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\bhasan\b/g, 'hassan')
  .replace(/\b(?:newly|latest|multi|sample|original|direct|authentic|creator|persona|voice|cloned|clone)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export function selectElevenLabsPersonaVoice(
  voices: ElevenLabsVoiceSummary[],
  requestedVoiceId: unknown,
  personaName: unknown,
): ElevenLabsVoiceSummary | undefined {
  const requestedId = typeof requestedVoiceId === 'string' ? requestedVoiceId.trim() : '';
  if (requestedId) {
    const exactId = voices.find(voice => voice.voice_id === requestedId);
    if (exactId) return exactId;
  }

  const persona = normalizeName(typeof personaName === 'string' ? personaName : '');
  if (!persona) return undefined;

  const personaParts = persona.split(' ');
  const firstName = personaParts[0];
  const lastName = personaParts.length > 1 ? personaParts[personaParts.length - 1] : '';

  const ranked = voices
    .map((voice, index) => {
      const candidate = normalizeName(voice.name || '');
      const parts = candidate.split(' ').filter(Boolean);
      let score = 0;
      if (candidate === persona) score = 100;
      else if (candidate.startsWith(`${persona} `)) score = 95;
      else if (parts[0] === firstName) score = 70;

      if (score > 0 && lastName && parts.includes(lastName)) score += 15;
      if (score > 0 && voice.category?.toLowerCase().includes('clon')) score += 5;
      return { voice, score, index };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return ranked[0]?.voice;
}

export function isValidPublicVoiceReference(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const reference = value.trim();
  if (/^https:\/\//i.test(reference)) return true;

  const dataUrl = reference.match(/^data:(audio|video)\/[a-z0-9.+_-]+;base64,([a-z0-9+/=\s]+)$/i);
  if (!dataUrl) return false;
  const payload = dataUrl[2].replace(/\s+/g, '');
  if (payload.length < 128 || payload.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) {
    return false;
  }

  try {
    return Buffer.from(payload, 'base64').byteLength >= 64;
  } catch {
    return false;
  }
}

export function isProviderAccountUnavailableStatus(status: unknown): boolean {
  return status === 401 || status === 402 || status === 403;
}

export function isElevenLabsVoiceEngine(value: unknown): boolean {
  const model = String(value || '').toLowerCase();
  return model.startsWith('eleven_') || model.includes('elevenlabs');
}

export function isDirectElevenLabsVoiceId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9]{18,24}$/.test(value.trim());
}

export function normalizeNaturalVoiceGreeting(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;

  const cleaned = value
    .replace(/\[[^\]]*\]|\([^)]*(?:laugh|smile|pause|sigh|giggle)[^)]*\)/gi, ' ')
    .replace(/^\s*(?:assistant|persona|greeting)\s*:\s*/i, '')
    .replace(/^\s*["“”]+|["“”]+\s*$/g, '')
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return fallback;

  const sentences = cleaned.match(/[^.!?]+[.!?]?/g)?.map(sentence => sentence.trim()).filter(Boolean) || [];
  const candidate = sentences.slice(0, 2).join(' ').trim();
  const wordCount = candidate.split(/\s+/).filter(Boolean).length;

  // A call opening should feel like someone answering the phone, not a speech.
  // Fall back to a deliberately short local line if a provider ignores the cap.
  return wordCount >= 2 && wordCount <= 18 ? candidate : fallback;
}
