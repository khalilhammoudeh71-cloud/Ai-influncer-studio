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

const META_DIRECTION_LABEL = /(?:voice|tone|delivery|emotion|cadence|pitch|speaking style|voice direction|stage direction|performance note|instruction)s?/i;

/**
 * Converts a model reply into text that is safe to show as dialogue and send
 * to a speech provider. This is deliberately server-side so every client and
 * every TTS engine receives the same spoken-only response.
 */
export function sanitizeSpokenDialogue(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';

  let cleaned = value
    // Private reasoning and fenced prompt/instruction blocks.
    .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove explicit delivery labels without throwing away dialogue that
    // follows the label sentence.
    .replace(new RegExp(`(?:^|\\n)\\s*${META_DIRECTION_LABEL.source}\\s*:\\s*[^.!?\\n]*(?:[.!?]\\s*|$)`, 'gi'), ' ')
    // Markdown, bracketed, and parenthetical stage directions. The open-ended
    // alternatives also protect TTS when a provider closes a malformed reply.
    .replace(/\*{1,3}[^*\n]*(?:\*{1,3}|$)/g, ' ')
    .replace(/\[[^\]\n]*(?:\]|$)/g, ' ')
    .replace(/\((?=[^)]*(?:giggl|laugh|chuckl|smil|sigh|pause|whisper|murmur|breath|tone|voice|delivery|cadence|pitch|emotion|shy|playful|seductive|softly|quietly))[^)\n]*(?:\)|$)/gi, ' ')
    // Model-authored prose about how the line should sound.
    .replace(/^\s*(?:(?:speaking|responding|replying|saying)\s+(?:in|with)|(?:in|with))\s+(?:an?\s+)?[^:,.!?\n]{0,90}(?:voice|tone|delivery|cadence)\s*[:,.-]?\s*/i, '')
    // Novel-style physical narration that occasionally escapes role-play
    // models even when the prompt asks for spoken words only.
    .replace(/(?:(?:My|Her)\s+(?:eyebrows|eyes|lips|hand|hands|fingers|body|head)\s+[^.!?\n]+[.!?]?)/gi, ' ')
    .replace(/(?:(?:I|She)\s+(?:lean|leaned|leans|smirk|smirks|smirked|smile|smiles|smiled|raise|raises|raised|tilt|tilts|tilted|roll|rolls|rolled|bite|bites|bit|toss|tosses|tossed|giggle|giggles|giggled|laugh|laughs|laughed|sigh|sighs|sighed|chuckle|chuckles|chuckled|gaze|gazes|gazed|step|steps|stepped|whisper|whispers)\s+[^.!?\n]+[.!?]?)/gi, ' ')
    .replace(/(?:a\s+(?:soft|playful|seductive|knowing|gentle|warm|wicked|sarcastic|challenging|shy)\s+(?:laugh|smile|smirk|glint|chuckle|giggle|sigh|gaze|look)[^.!?\n]*[.!?]?)/gi, ' ')
    .replace(/(?:^|(?<=[.!?])\s+)(?:(?:My|Her|The)\s+voice\s+(?:turns?|becomes?|drops?|softens?|shifts?|takes?\s+on|is)\s+(?:[^.!?\n]{0,80}\s)?(?:soft|breathy|playful|seductive|warm|gentle|quiet|low|shy|teasing)[^.!?\n]*[.!?]?)/gi, ' ')
    .replace(/(?:^|(?<=[.!?])\s+)(?:I\s+(?:say|reply|respond|answer|continue)\s+(?:it\s+)?(?:in|with)\s+(?:an?\s+)?[^.!?\n]{0,90}(?:voice|tone|delivery|cadence)[^.!?\n]*[.!?]?)/gi, ' ')
    // Standalone stage directions sometimes arrive without punctuation or
    // wrappers (for example: "shy giggles").
    .replace(/(?:^|\n)\s*(?:(?:shy|soft|playful|nervous|quiet|gentle|seductive)\s+)?(?:giggles?|laughs?|chuckles?|sighs?|pauses?|whispers?|smiles?)(?:\s+(?:softly|quietly|shyly|nervously))?\s*(?:[:,.\-–—]|$)/gim, ' ')
    // Speaker and instruction prefixes.
    .replace(/^\s*(?:thinking|thought|inner thought|narrator|persona|assistant|response|dialogue)\s*:\s*/i, '')
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/[_#`\\~]/g, '')
    .replace(/^\s*["“”]+|["“”]+\s*$/g, '')
    .replace(/'+/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 2) return '';

  cleaned = cleaned.replace(/[-–—\s]+$/, '').trim();
  if (!cleaned) return '';
  cleaned = cleaned.replace(/^([a-z])/, (_, firstLetter: string) => firstLetter.toUpperCase());
  if (!/[.!?]$/.test(cleaned)) cleaned += '.';
  return cleaned;
}

export interface SpokenDialogueStream {
  push(delta: string): void;
  flush(): string;
  getText(): string;
}

function findSafeSpeechBoundary(value: string): number {
  let squareDepth = 0;
  let parenDepth = 0;
  let inAsterisks = false;
  let inThink = false;

  for (let index = 0; index < value.length; index += 1) {
    const remainder = value.slice(index).toLowerCase();
    if (remainder.startsWith('<think>')) {
      inThink = true;
      index += '<think>'.length - 1;
      continue;
    }
    if (remainder.startsWith('</think>')) {
      inThink = false;
      index += '</think>'.length - 1;
      continue;
    }
    if (inThink) continue;

    const character = value[index];
    if (character === '*') {
      let runLength = 1;
      while (value[index + runLength] === '*') runLength += 1;
      if (runLength % 2 === 1 || runLength <= 3) inAsterisks = !inAsterisks;
      index += runLength - 1;
      continue;
    }
    if (inAsterisks) continue;
    if (character === '[') squareDepth += 1;
    else if (character === ']' && squareDepth > 0) squareDepth -= 1;
    else if (character === '(') parenDepth += 1;
    else if (character === ')' && parenDepth > 0) parenDepth -= 1;

    if (squareDepth > 0 || parenDepth > 0) continue;
    if (character === '\n') return index + 1;
    if (/[.!?]/.test(character)) {
      const next = value[index + 1];
      if (!next || /\s/.test(next)) return index + 1;
    }
  }

  return -1;
}

/**
 * Buffers raw model deltas until a complete phrase exists, then emits only its
 * sanitized spoken form. This prevents partial stage directions from reaching
 * TTS while retaining sentence-level streaming latency.
 */
export function createSpokenDialogueStream(
  onChunk: (chunk: string) => void,
  transformPart: (spokenPart: string) => string = spokenPart => spokenPart,
): SpokenDialogueStream {
  let pending = '';
  const spokenParts: string[] = [];

  const emit = (rawPart: string) => {
    const safePart = transformPart(sanitizeSpokenDialogue(rawPart)).trim();
    if (!safePart) return;
    const streamedPart = spokenParts.length > 0 ? ` ${safePart}` : safePart;
    spokenParts.push(safePart);
    onChunk(streamedPart);
  };

  const drain = () => {
    let boundary = findSafeSpeechBoundary(pending);
    while (boundary >= 0) {
      const rawPart = pending.slice(0, boundary);
      pending = pending.slice(boundary);
      emit(rawPart);
      boundary = findSafeSpeechBoundary(pending);
    }
  };

  return {
    push(delta: string) {
      if (!delta) return;
      pending += delta;
      drain();
    },
    flush() {
      drain();
      if (pending.trim()) emit(pending);
      pending = '';
      return spokenParts.join(' ').trim();
    },
    getText() {
      return spokenParts.join(' ').trim();
    },
  };
}
