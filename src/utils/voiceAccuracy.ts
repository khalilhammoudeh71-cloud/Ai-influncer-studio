export const VOICE_ACCURACY_STORAGE_KEY = 'voice_accuracy_profile';

export interface VoiceCorrection {
  heard: string;
  intended: string;
  uses: number;
  updatedAt: string;
}

export interface VoiceAccuracyProfile {
  corrections: VoiceCorrection[];
  customTerms: string[];
  calibrationCompletedAt?: string;
}

export const EMPTY_VOICE_ACCURACY_PROFILE: VoiceAccuracyProfile = {
  corrections: [],
  customTerms: [],
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parseVoiceAccuracyProfile(raw: string | null | undefined): VoiceAccuracyProfile {
  if (!raw) return { ...EMPTY_VOICE_ACCURACY_PROFILE };
  try {
    const parsed = JSON.parse(raw) as Partial<VoiceAccuracyProfile>;
    return {
      corrections: Array.isArray(parsed.corrections)
        ? parsed.corrections
            .filter(item => item && typeof item.heard === 'string' && typeof item.intended === 'string')
            .map(item => ({
              heard: item.heard.trim(),
              intended: item.intended.trim(),
              uses: Number.isFinite(item.uses) ? Math.max(1, Number(item.uses)) : 1,
              updatedAt: item.updatedAt || new Date(0).toISOString(),
            }))
            .filter(item => item.heard && item.intended)
            .slice(0, 60)
        : [],
      customTerms: Array.isArray(parsed.customTerms)
        ? Array.from(new Set(parsed.customTerms.map(term => String(term).trim()).filter(term => term && term.length <= 20))).slice(0, 50)
        : [],
      calibrationCompletedAt: typeof parsed.calibrationCompletedAt === 'string'
        ? parsed.calibrationCompletedAt
        : undefined,
    };
  } catch {
    return { ...EMPTY_VOICE_ACCURACY_PROFILE };
  }
}

export function applyVoiceCorrections(transcript: string, corrections: VoiceCorrection[]): string {
  let result = transcript.trim();
  const ordered = [...corrections]
    .filter(item => item.heard.trim() && item.intended.trim() && normalize(item.heard) !== normalize(item.intended))
    .sort((a, b) => b.heard.length - a.heard.length);

  for (const correction of ordered) {
    const heardPattern = correction.heard
      .trim()
      .split(/\s+/)
      .map(escapeRegExp)
      .join('\\s+');
    result = result.replace(new RegExp(`\\b${heardPattern}\\b`, 'gi'), correction.intended);
  }
  return result.replace(/\s+/g, ' ').trim();
}

export function saveVoiceCorrection(
  profile: VoiceAccuracyProfile,
  heard: string,
  intended: string,
): VoiceAccuracyProfile {
  const cleanHeard = heard.replace(/\s+/g, ' ').trim();
  const cleanIntended = intended.replace(/\s+/g, ' ').trim();
  if (!cleanHeard || !cleanIntended || normalize(cleanHeard) === normalize(cleanIntended)) return profile;

  const existingIndex = profile.corrections.findIndex(item => normalize(item.heard) === normalize(cleanHeard));
  const corrections = [...profile.corrections];
  const next: VoiceCorrection = {
    heard: cleanHeard,
    intended: cleanIntended,
    uses: existingIndex >= 0 ? corrections[existingIndex].uses + 1 : 1,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) corrections.splice(existingIndex, 1);
  corrections.unshift(next);

  return { ...profile, corrections: corrections.slice(0, 60) };
}

export function addVoiceTerms(profile: VoiceAccuracyProfile, terms: string[]): VoiceAccuracyProfile {
  const byNormalized = new Map<string, string>();
  [...terms, ...profile.customTerms].forEach(term => {
    const clean = String(term || '').replace(/\s+/g, ' ').trim();
    if (clean && clean.length <= 20 && !byNormalized.has(normalize(clean))) {
      byNormalized.set(normalize(clean), clean);
    }
  });
  return { ...profile, customTerms: [...byNormalized.values()].slice(0, 50) };
}

export function buildVoiceKeyterms(profile: VoiceAccuracyProfile, baseTerms: string[]): string[] {
  const ordered = [
    ...baseTerms,
    ...profile.customTerms,
    ...profile.corrections.flatMap(item => [item.intended, item.heard]),
  ];
  const seen = new Set<string>();
  return ordered.filter(term => {
    const clean = String(term || '').replace(/\s+/g, ' ').trim();
    const key = normalize(clean);
    if (!key || clean.length > 20 || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 50);
}

/** Finds small mismatched phrase pairs from a controlled calibration sentence. */
export function deriveCalibrationCorrections(heard: string, intended: string): Array<{ heard: string; intended: string }> {
  const heardWords = heard.trim().split(/\s+/).filter(Boolean);
  const intendedWords = intended.trim().split(/\s+/).filter(Boolean);
  const rows = heardWords.length + 1;
  const cols = intendedWords.length + 1;
  const lcs = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = heardWords.length - 1; i >= 0; i--) {
    for (let j = intendedWords.length - 1; j >= 0; j--) {
      lcs[i][j] = normalize(heardWords[i]) === normalize(intendedWords[j])
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const corrections: Array<{ heard: string; intended: string }> = [];
  let i = 0;
  let j = 0;
  let heardChunk: string[] = [];
  let intendedChunk: string[] = [];
  const flush = () => {
    const heardPhrase = heardChunk.join(' ').replace(/[^a-z0-9' .-]/gi, '').trim();
    const intendedPhrase = intendedChunk.join(' ').replace(/[^a-z0-9' .-]/gi, '').trim();
    if (heardPhrase && intendedPhrase && normalize(heardPhrase) !== normalize(intendedPhrase)) {
      corrections.push({ heard: heardPhrase, intended: intendedPhrase });
    }
    heardChunk = [];
    intendedChunk = [];
  };

  while (i < heardWords.length || j < intendedWords.length) {
    if (i < heardWords.length && j < intendedWords.length && normalize(heardWords[i]) === normalize(intendedWords[j])) {
      flush();
      i++;
      j++;
    } else if (j < intendedWords.length && (i >= heardWords.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      intendedChunk.push(intendedWords[j++]);
    } else if (i < heardWords.length) {
      heardChunk.push(heardWords[i++]);
    }
  }
  flush();

  return corrections.filter(item => item.heard.split(/\s+/).length <= 5 && item.intended.split(/\s+/).length <= 5);
}

export function isDuplicateVoiceTranscript(
  transcript: string,
  previous: { text: string; at: number },
  now = Date.now(),
): boolean {
  const current = normalize(transcript);
  const last = normalize(previous.text);
  if (!current || current !== last) return false;
  const wordCount = current.split(/\s+/).length;
  return now - previous.at < (wordCount >= 3 ? 8000 : 1800);
}

export function needsVoiceConfirmation(transcript: string): boolean {
  const clean = normalize(transcript);
  const isMediaRequest = /\b(?:generate|create|make|send|show|take|record)\b/.test(clean)
    && /\b(?:image|photo|picture|selfie|video|clip)\b/.test(clean);
  if (!isMediaRequest) return false;
  const words = clean.split(/\s+/).filter(Boolean);
  return words.length < 4 || /\b(?:of|with|wearing|using|and|in|at|from)$/.test(clean);
}
