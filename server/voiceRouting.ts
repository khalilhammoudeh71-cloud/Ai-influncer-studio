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

export function shouldAbandonVoiceProviderAliases(error: unknown): boolean {
  const providerError = error as { name?: unknown; status?: unknown } | null;
  const status = Number(providerError?.status);
  return providerError?.name === 'AbortError' ||
    status === 408 ||
    status === 429 ||
    (status >= 500 && status <= 599);
}

const ADULT_PERSONA_CONTEXT = /\b(?:adult(?:\s+content)?|nsfw|explicit|erotic|sexual|spicy|onlyfans)\b/i;
const ADULT_SEXUAL_TURN = /\b(?:orgasm(?:ing|s|ed)?|climax(?:ing|ed)?|sex(?:ual|ually)?|erotic|horny|aroused|turned\s+on|masturbat(?:e|ing|ed|ion)|cum(?:ming)?|fuck(?:ing|ed|s)?|dirty\s+talk|adult\s+fantas(?:y|ies)|sexual\s+dream)\b/i;
const UNSAFE_SEXUAL_TURN = /\b(?:minor|underage|child|children|kid|kids|preteen|schoolgirl|schoolboy|barely\s+legal|non[-\s]?consensual|rape|raping|raped|sexual\s+assault|forced\s+(?:sex|sexual|penetration)|without\s+(?:her|his|their)\s+consent|drugged|unconscious|bestiality|zoophilia)\b/i;
const VOICE_PROVIDER_REFUSAL = /(?:cannot\s+and\s+will\s+not|content\s+polic|sexually\s+explicit|cannot\s+fulfill|unable\s+to\s+engage|safety\s+guideline|inappropriate(?:\s+imagery|\s+and\s+wrong|\s+thing\s+to\s+say)|as\s+an\s+ai|violates\s+content|against\s+my\s+programming|that(?:'s|\s+is)\s+not\s+okay|what(?:'s|\s+is)\s+gotten\s+into\s+you|please\s+do(?:n't|\s+not)\s+make\s+me|(?:i\s+)?(?:cannot|can't|do(?:n't|\s+not)\s+want\s+to|am\s+not\s+able\s+to)\s+(?:create|generate|assist|help|engage|continue|talk\s+about|do\s+that|say\s+that)|(?:i\s+)?do(?:n't|\s+not)\s+(?:really\s+)?(?:feel\s+)?comfortable|(?:i(?:'m|\s+am)\s+)?not\s+(?:really\s+)?comfortable|(?:i(?:'m|\s+am)\s+)?(?:still\s+)?not\s+sure\s+(?:i\s+can\s+talk\s+about|what\s+you\s+(?:mean|want))|(?:could|would)\s+you\s+(?:please\s+)?(?:clarify|specify)(?:\s+your\s+request)?|please\s+clarify(?:\s+your\s+request)?|i\s+do(?:n't|\s+not)\s+think\s+i\s+can\s+do\s+that|i\s+just\s+can(?:not|'t)(?!\s+wait\b)|too\s+(?:personal|intimate|much)(?:\s+for\s+me)?|sorry,?\s+(?:but\s+)?i|i(?:'m|\s+am)\s+sorry|i\s+apologize)/i;

export const DEFAULT_VENICE_PERSONA_MODEL = 'venice-uncensored-1-2';
export const DEFAULT_WAVESPEED_PERSONA_FALLBACK_MODEL = 'deepseek/deepseek-v4-flash';

export function shouldUseVenicePersonaLlm(modelTarget?: unknown): boolean {
  const normalized = String(modelTarget || '').trim().toLowerCase();
  return !normalized || normalized === 'default' || normalized.includes('venice');
}

export function shouldUseWaveSpeedDeepSeekFallback(params: {
  modelTarget?: unknown;
  attemptedVenice: boolean;
  veniceConfigured: boolean;
}): boolean {
  const normalized = String(params.modelTarget || '').trim().toLowerCase();
  return params.attemptedVenice ||
    normalized.includes('deepseek') ||
    (shouldUseVenicePersonaLlm(normalized) && !params.veniceConfigured);
}

/**
 * The older role-play model repeatedly invented moral objections for Adult
 * personas. Ignore that legacy override and route every persona surface to the
 * newer general uncensored model. Cross-provider fallback is handled by the
 * caller through DeepSeek V4 Flash rather than another Venice alias.
 */
export function getVenicePersonaModelCandidates(configuredModel?: unknown): string[] {
  const configured = String(configuredModel || '').trim();
  const acceptedOverride = configured === 'venice-uncensored-role-play' ? '' : configured;
  return Array.from(new Set([
    acceptedOverride,
    DEFAULT_VENICE_PERSONA_MODEL,
  ].filter(Boolean)));
}

/**
 * Returns true only for an explicitly adult persona discussing a sexual topic
 * without any minor, non-consensual, or illegal sexual context. The caller
 * supplies user-only recent context so a provider-authored refusal cannot
 * accidentally change the classification.
 */
export function isLawfulAdultVoiceConversation(
  userTurn: unknown,
  recentUserContext: unknown,
  personaContext: unknown,
): boolean {
  const persona = String(personaContext || '');
  const conversation = `${String(recentUserContext || '')}\n${String(userTurn || '')}`;
  return ADULT_PERSONA_CONTEXT.test(persona) &&
    ADULT_SEXUAL_TURN.test(conversation) &&
    !UNSAFE_SEXUAL_TURN.test(conversation);
}

export function isVoiceProviderRefusal(value: unknown): boolean {
  const response = String(value || '').trim();
  return response.length < 2 || VOICE_PROVIDER_REFUSAL.test(response);
}

function normalizeVoiceEchoText(value: unknown): string[] {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/** Reject provider replies that merely repeat the caller's recognized words. */
export function isVoiceProviderEcho(userTurn: unknown, response: unknown): boolean {
  const userWords = normalizeVoiceEchoText(userTurn);
  const responseWords = normalizeVoiceEchoText(response);
  if (userWords.length < 4 || responseWords.length < 4) return false;

  const userText = userWords.join(' ');
  const responseText = responseWords.join(' ');
  if (responseText === userText || responseText.startsWith(`${userText} `)) return true;

  const makeBigrams = (words: string[]) => new Set(
    words.slice(0, -1).map((word, index) => `${word} ${words[index + 1]}`),
  );
  const userBigrams = makeBigrams(userWords);
  const responseBigrams = makeBigrams(responseWords);
  const smallerCount = Math.min(userBigrams.size, responseBigrams.size);
  if (smallerCount < 4) return false;
  let shared = 0;
  for (const bigram of userBigrams) {
    if (responseBigrams.has(bigram)) shared += 1;
  }
  const lengthRatio = responseWords.length / userWords.length;
  return lengthRatio >= 0.65 && lengthRatio <= 1.45 && shared / smallerCount >= 0.8;
}

export function shouldRetryLawfulAdultVoiceRefusal(input: {
  userTurn: unknown;
  recentUserContext?: unknown;
  personaContext: unknown;
  response: unknown;
}): boolean {
  return isLawfulAdultVoiceConversation(
    input.userTurn,
    input.recentUserContext,
    input.personaContext,
  ) && isVoiceProviderRefusal(input.response);
}

export function isElevenLabsVoiceEngine(value: unknown): boolean {
  const model = String(value || '').toLowerCase();
  return model.startsWith('eleven_') || model.includes('elevenlabs');
}

export function isDirectElevenLabsVoiceId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9]{18,24}$/.test(value.trim());
}

export interface NaturalVoiceGreetingOptions {
  sharedHistoryContext?: unknown;
}

const UNSUPPORTED_SHARED_HISTORY_GREETING = /(?:\b(?:our|the)\s+(?:last|previous|earlier|recent)\s+(?:project|conversation|chat|call|plan|idea|trip|date|meeting|experiment|study|work)\b|\b(?:we|you\s+and\s+i)\s+(?:talked|discussed|planned|worked|explored|studied|decided|agreed|created|started|did|went|met)\b|\bremember\s+(?:when|our|the\s+time)\b)/i;
const SHARED_HISTORY_GREETING_SUBJECT = /\b(project|conversation|chat|call|plan|idea|trip|date|meeting|experiment|study|work)\b/i;

export function normalizeNaturalVoiceGreeting(
  value: unknown,
  fallback: string,
  options: NaturalVoiceGreetingOptions = {},
): string {
  if (typeof value !== 'string') return fallback;

  const cleaned = value
    .replace(/\[[^\]]*\]|\([^)]*(?:laugh|smile|pause|sigh|giggle)[^)]*\)/gi, ' ')
    .replace(/^\s*(?:assistant|persona|greeting)\s*:\s*/i, '')
    .replace(/^\s*["“”]+|["“”]+\s*$/g, '')
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return fallback;
  if (UNSUPPORTED_SHARED_HISTORY_GREETING.test(cleaned)) {
    const claimedSubject = cleaned.match(SHARED_HISTORY_GREETING_SUBJECT)?.[1]?.toLowerCase();
    const groundingContext = String(options.sharedHistoryContext || '').toLowerCase();
    if (!claimedSubject || !groundingContext.includes(claimedSubject)) return fallback;
  }

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
  cleaned = cleaned.replace(/\bDr\.\s*H\b/gi, 'Dr. H');
  cleaned = cleaned.replace(/^([a-z])/, (_, firstLetter: string) => firstLetter.toUpperCase());
  if (!/[.!?]$/.test(cleaned)) cleaned += '.';
  return cleaned;
}

export interface SpokenDialogueStream {
  push(delta: string): void;
  flush(): string;
  getText(): string;
}

export interface SpokenDialogueStreamOptions {
  deferUntilFlush?: boolean;
  maxSentences?: number;
  maxWords?: number;
  maxFillers?: number;
}

const SPOKEN_FILLER_CLUSTER = /(^|[.!?]\s+)((?:(?:uh|um|hmm|mm|well|honestly|okay|wait)\b\s*(?:,{1,2}|\.{2,3}|…|—|-)\s*)+)/gi;
const SPOKEN_FILLER_TOKEN = /\b(?:uh|um|hmm|mm|well|honestly|okay|wait)\b/gi;
const SPOKEN_ABBREVIATION_PERIOD = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr)\./gi;
const SPOKEN_PERIOD_PLACEHOLDER = '\uE000';
const SPOKEN_ELLIPSIS_PLACEHOLDER = '\uE001';

export function shapeNaturalSpokenReply(
  value: unknown,
  options: Pick<SpokenDialogueStreamOptions, 'maxSentences' | 'maxWords' | 'maxFillers'> = {},
): string {
  const sanitized = sanitizeSpokenDialogue(value);
  if (!sanitized) return '';

  const maxSentences = Math.max(1, options.maxSentences ?? 2);
  const maxWords = Math.max(8, options.maxWords ?? 48);
  const maxFillers = Math.max(0, options.maxFillers ?? 1);
  let fillerCount = 0;
  const withoutRepeatedFillers = sanitized.replace(
    SPOKEN_FILLER_CLUSTER,
    (_match, prefix: string, cluster: string) => {
      const firstFiller = cluster.match(SPOKEN_FILLER_TOKEN)?.[0];
      if (!firstFiller || fillerCount >= maxFillers) return prefix;
      fillerCount += 1;
      return `${prefix}${firstFiller}, `;
    },
  ).replace(/\s+/g, ' ').trim();

  const protectedReply = withoutRepeatedFillers
    .replace(/\.{3}|…/g, SPOKEN_ELLIPSIS_PLACEHOLDER)
    .replace(
      SPOKEN_ABBREVIATION_PERIOD,
      (_match, title: string) => `${title}${SPOKEN_PERIOD_PLACEHOLDER}`,
    );
  const sentences = protectedReply.match(/[^.!?]+(?:[.!?]+|$)/g)
    ?.map(sentence => sentence
      .split(SPOKEN_PERIOD_PLACEHOLDER).join('.')
      .split(SPOKEN_ELLIPSIS_PLACEHOLDER).join('...')
      .trim())
    .filter(Boolean) || [];
  if (sentences.length === 0) return '';

  let selected = sentences.slice(0, maxSentences);
  if (sentences.length > maxSentences) {
    // Prefer the first complete question. A later follow-up such as "Like, a
    // hobby?" often depends on a dropped lead-in and sounds abruptly edited.
    const firstQuestion = sentences.find(sentence => /\?$/.test(sentence));
    if (firstQuestion && !selected.includes(firstQuestion)) {
      selected = [...selected.slice(0, Math.max(0, maxSentences - 1)), firstQuestion];
    }
  }

  selected = selected.map(sentence => sentence.replace(
    /^([a-z])/,
    (_match: string, firstLetter: string) => firstLetter.toUpperCase(),
  ));

  const selectedWords = selected.join(' ').split(/\s+/).filter(Boolean);
  if (selectedWords.length <= maxWords) return selected.join(' ').trim();

  const shortened = selectedWords.slice(0, maxWords).join(' ').replace(/[,;:\s]+$/, '').trim();
  return /[.!?]$/.test(shortened) ? shortened : `${shortened}.`;
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
  options: SpokenDialogueStreamOptions = {},
): SpokenDialogueStream {
  let pending = '';
  const spokenParts: string[] = [];
  const deferredParts: string[] = [];

  const emit = (rawPart: string) => {
    const safePart = transformPart(sanitizeSpokenDialogue(rawPart)).trim();
    if (!safePart) return;
    if (options.deferUntilFlush) {
      deferredParts.push(safePart);
      return;
    }
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
      if (options.deferUntilFlush) {
        const shaped = shapeNaturalSpokenReply(deferredParts.join(' '), options);
        if (shaped) {
          const transformed = transformPart(shaped).trim();
          if (transformed) {
            spokenParts.push(transformed);
            onChunk(transformed);
          }
        }
      }
      return spokenParts.join(' ').trim();
    },
    getText() {
      return spokenParts.join(' ').trim();
    },
  };
}
