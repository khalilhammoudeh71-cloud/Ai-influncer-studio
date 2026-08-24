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

const INTERRUPT_PREFIX = /^(?:stop|wait|hold on|pause|no|actually|cancel|never mind|nevermind)\b/i;

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
