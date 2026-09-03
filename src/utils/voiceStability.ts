export type VoiceTranscriptSource = 'realtime' | 'browser';

export interface VoiceInterruptContext {
  source: VoiceTranscriptSource;
  personaSpeech?: string;
  personaIsSpeaking: boolean;
  responseIsPending?: boolean;
  hasFreshVoiceEnergy?: boolean;
}

export interface VoiceTurnTiming {
  speechStartedAt?: number;
  transcriptCommittedAt?: number;
  requestStartedAt: number;
  firstTextAt?: number;
  firstAudioAt?: number;
}

export interface VoiceLatencySnapshot {
  recognitionMs?: number;
  modelMs?: number;
  speechMs?: number;
  responseMs?: number;
  endToEndMs?: number;
}

export interface SpeakableChunkOptions {
  force?: boolean;
  firstChunk?: boolean;
  allowEarlyPartial?: boolean;
}

export interface SpeakableChunkResult {
  chunk?: string;
  remainder: string;
}

export type RealtimeTranscriptionRecoveryAction = 'reconnect' | 'browser-fallback';

export function getRealtimeTranscriptionRecoveryAction(
  failureCount: number,
  maxReconnects = 2,
): RealtimeTranscriptionRecoveryAction {
  return failureCount <= Math.max(0, maxReconnects) ? 'reconnect' : 'browser-fallback';
}

export interface VoiceTurnCommitOptions {
  source: VoiceTranscriptSource;
  hasTerminalPunctuation?: boolean;
}

const INTERRUPT_PREFIX = /^(?:stop|wait|hold on|pause|no|actually|cancel|never mind|nevermind)\b/i;

const OPEN_ENDED_TURN_ENDING = /(?:\b(?:and|or|but|so|because|then|when|if|that|which|who|where|while|although|unless|with|without|for|about|to|the|a|an|my|your|our|their|this|these|those|i|we|you|he|she|they|it|is|are|was|were|do|does|did|can|could|would|should|will|just|like|um|uh)\b|[,;:\-\u2014\u2013])$/i;

const OPEN_ENDED_PHRASE = /\b(?:i (?:was|am|have been) (?:thinking|wondering|trying)|can you|could you|would you|do you|what if|the thing is|it is because|it's because|i mean|for example)\s*$/i;

const ECHO_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'for', 'from', 'i', 'if', 'in',
  'is', 'it', 'me', 'my', 'of', 'on', 'or', 'so', 'that', 'the', 'this', 'to', 'we',
  'with', 'you', 'your',
]);

export function normalizeVoiceWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function longestCommonSubsequenceLength(left: string[], right: string[]): number {
  const previous = new Array<number>(right.length + 1).fill(0);
  const current = new Array<number>(right.length + 1).fill(0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      current[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? previous[rightIndex - 1] + 1
        : Math.max(previous[rightIndex], current[rightIndex - 1]);
    }
    for (let index = 0; index <= right.length; index++) {
      previous[index] = current[index];
      current[index] = 0;
    }
  }

  return previous[right.length];
}

/**
 * Detects delayed speaker leakage without suppressing explicit user interruptions.
 * The sequence check is intentionally conservative so a real short reply such as
 * "yes" remains usable immediately after the persona finishes speaking.
 */
export function isLikelyPersonaEcho(candidate: string, personaSpeech: string): boolean {
  if (INTERRUPT_PREFIX.test(candidate.trim())) return false;

  const heard = normalizeVoiceWords(candidate);
  const spoken = normalizeVoiceWords(personaSpeech);
  if (heard.length < 3 || spoken.length === 0) return false;

  const heardPhrase = heard.join(' ');
  const spokenPhrase = spoken.join(' ');
  if (spokenPhrase.includes(heardPhrase)) return true;

  const sequenceCoverage = longestCommonSubsequenceLength(heard, spoken) / heard.length;
  const spokenWords = new Set(spoken);
  const contentWords = heard.filter(word => !ECHO_STOP_WORDS.has(word));
  const contentCoverage = contentWords.length > 0
    ? contentWords.filter(word => spokenWords.has(word)).length / contentWords.length
    : 0;

  return heard.length >= 4 && sequenceCoverage >= 0.78 && contentCoverage >= 0.72;
}

/** Returns true as soon as a partial transcript is safe enough to stop playback. */
export function shouldInterruptPersonaSpeech(
  partialTranscript: string,
  context: VoiceInterruptContext,
): boolean {
  const clean = partialTranscript.trim();
  if (!clean || (!context.personaIsSpeaking && !context.responseIsPending)) return false;
  if (isLikelyPersonaEcho(clean, context.personaSpeech || '')) return false;
  if (INTERRUPT_PREFIX.test(clean)) return true;

  const words = normalizeVoiceWords(clean);
  if (words.length < 2) return false;

  // Realtime transcription already includes its own VAD and background filter.
  if (context.source === 'realtime') return true;

  // The browser recognizer needs a separate acoustic confidence signal while
  // speaker audio is playing. During a silent model request there is no echo.
  return !context.personaIsSpeaking || Boolean(context.hasFreshVoiceEnergy);
}

/**
 * Returns a short, transcript-aware grace period before a recognized phrase is
 * committed as a complete user turn. Complete questions and commands move on
 * quickly; fillers and open clauses get enough room for a natural breath.
 */
export function getVoiceTurnCommitDelay(
  transcript: string,
  options: VoiceTurnCommitOptions,
): number {
  const clean = transcript.replace(/\s+/g, ' ').trim();
  if (!clean) return 0;
  if (INTERRUPT_PREFIX.test(clean)) return 90;

  const terminalPunctuation = options.hasTerminalPunctuation ?? /[.!?]["')\]]?$/.test(clean);
  if (terminalPunctuation) return options.source === 'realtime' ? 90 : 160;
  if (OPEN_ENDED_TURN_ENDING.test(clean) || OPEN_ENDED_PHRASE.test(clean)) {
    return options.source === 'realtime' ? 700 : 900;
  }

  const words = normalizeVoiceWords(clean);
  if (words.length <= 2) return options.source === 'realtime' ? 260 : 380;
  if (words.length >= 10) return options.source === 'realtime' ? 150 : 260;
  return options.source === 'realtime' ? 200 : 340;
}

/**
 * Merges consecutive committed recognition segments without duplicating text
 * when a provider repeats the whole utterance on its next commit event.
 */
export function mergeVoiceTranscriptSegments(previous: string, next: string): string {
  const left = previous.replace(/\s+/g, ' ').trim();
  const right = next.replace(/\s+/g, ' ').trim();
  if (!left) return right;
  if (!right) return left;

  const normalizedLeft = normalizeVoiceWords(left).join(' ');
  const normalizedRight = normalizeVoiceWords(right).join(' ');
  if (normalizedLeft === normalizedRight || normalizedLeft.endsWith(normalizedRight)) return left;
  if (normalizedRight.startsWith(normalizedLeft)) return right;

  const leftWords = left.split(' ');
  const rightWords = right.split(' ');
  const normalizedLeftWords = normalizeVoiceWords(left);
  const normalizedRightWords = normalizeVoiceWords(right);
  const maxOverlap = Math.min(leftWords.length, rightWords.length, 8);
  for (let overlap = maxOverlap; overlap >= 1; overlap--) {
    const leftTail = normalizedLeftWords.slice(-overlap).join(' ');
    const rightHead = normalizedRightWords.slice(0, overlap).join(' ');
    if (leftTail === rightHead) {
      return [...leftWords, ...rightWords.slice(overlap)].join(' ');
    }
  }

  return `${left} ${right}`;
}

/**
 * Pulls complete SSE data payloads from a text buffer. When flush is true, a
 * final event without a trailing blank line is still returned.
 */
export function drainSseData(buffer: string, flush = false): { data: string[]; remainder: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const blocks = normalized.split('\n\n');
  const remainder = flush ? '' : (blocks.pop() || '');

  const data = blocks
    .map(block => block
      .split('\n')
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart())
      .join('\n')
      .trim())
    .filter(Boolean);

  return { data, remainder };
}

const positiveDelta = (end?: number, start?: number): number | undefined => {
  if (typeof end !== 'number' || typeof start !== 'number' || end < start) return undefined;
  return Math.round(end - start);
};

export function summarizeVoiceLatency(timing: VoiceTurnTiming): VoiceLatencySnapshot {
  return {
    recognitionMs: positiveDelta(timing.transcriptCommittedAt, timing.speechStartedAt),
    modelMs: positiveDelta(timing.firstTextAt, timing.requestStartedAt),
    speechMs: positiveDelta(timing.firstAudioAt, timing.firstTextAt),
    responseMs: positiveDelta(timing.firstAudioAt, timing.requestStartedAt),
    endToEndMs: positiveDelta(timing.firstAudioAt, timing.speechStartedAt),
  };
}

/**
 * Pulls one TTS-friendly phrase from a partial model response. The first phrase
 * is intentionally short so speech can begin while the rest of the reply is
 * still streaming, while later phrases stay longer to avoid choppy playback.
 */
export function takeSpeakableSpeechChunk(
  buffer: string,
  options: SpeakableChunkOptions = {},
): SpeakableChunkResult {
  const normalized = buffer.trimStart();
  if (!normalized) return { remainder: '' };

  const sentence = normalized.match(/^([\s\S]{4,180}?[.!?])(?=\s|$)/);
  if (sentence) {
    return {
      chunk: sentence[1].trim(),
      remainder: normalized.slice(sentence[0].length).trimStart(),
    };
  }

  if (options.firstChunk) {
    const clause = normalized.match(/^([\s\S]{20,110}?[,;:\u2014\u2013])(?=\s|$)/);
    if (clause) {
      return {
        chunk: clause[1].trim(),
        remainder: normalized.slice(clause[0].length).trimStart(),
      };
    }

    if (normalized.length >= 72) {
      const nearbyBreak = Math.max(
        normalized.lastIndexOf(',', 72),
        normalized.lastIndexOf(';', 72),
        normalized.lastIndexOf(':', 72),
        normalized.lastIndexOf(' ', 72),
      );
      const splitAt = nearbyBreak >= 30 ? nearbyBreak + 1 : 72;
      return {
        chunk: normalized.slice(0, splitAt).trim(),
        remainder: normalized.slice(splitAt).trimStart(),
      };
    }

    // After the short first-speech timer expires, start from the latest whole
    // word rather than waiting for a short conversational reply to finish.
    if (options.allowEarlyPartial && normalized.length >= 24) {
      const splitAt = normalized.lastIndexOf(' ');
      if (splitAt >= 20) {
        return {
          chunk: normalized.slice(0, splitAt).trim(),
          remainder: normalized.slice(splitAt).trimStart(),
        };
      }
    }
  }

  if (normalized.length >= 140) {
    const nearbyBreak = Math.max(
      normalized.lastIndexOf(',', 120),
      normalized.lastIndexOf(';', 120),
      normalized.lastIndexOf(':', 120),
      normalized.lastIndexOf(' ', 120),
    );
    const splitAt = nearbyBreak >= 55 ? nearbyBreak + 1 : 120;
    return {
      chunk: normalized.slice(0, splitAt).trim(),
      remainder: normalized.slice(splitAt).trimStart(),
    };
  }

  if (options.force) {
    return { chunk: normalized, remainder: '' };
  }

  return { remainder: normalized };
}
