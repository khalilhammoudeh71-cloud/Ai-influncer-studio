export const VOICE_IDENTITY_STORAGE_KEY = 'voice_identity_profile';
export const VOICE_IDENTITY_ONBOARDING_STORAGE_KEY = 'voice_identity_onboarding_seen';
export const VOICE_IDENTITY_VECTOR_SIZE = 18;

export interface VoiceIdentityProfile {
  version: 1;
  enabled: boolean;
  centroid: number[];
  threshold: number;
  sampleCount: number;
  enrolledAt: string;
}

export function shouldOfferVoiceIdentitySetup(
  profile: VoiceIdentityProfile | null,
  onboardingSeen: string | null | undefined,
): boolean {
  return !profile && onboardingSeen !== '1';
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function parseVoiceIdentityProfile(raw: string | null | undefined): VoiceIdentityProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<VoiceIdentityProfile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.centroid) || parsed.centroid.length !== VOICE_IDENTITY_VECTOR_SIZE) return null;
    if (!parsed.centroid.every(value => Number.isFinite(value))) return null;
    return {
      version: 1,
      enabled: parsed.enabled !== false,
      centroid: parsed.centroid.map(Number),
      threshold: clamp(Number(parsed.threshold) || 0.84, 0.72, 0.96),
      sampleCount: Math.max(1, Number(parsed.sampleCount) || 1),
      enrolledAt: typeof parsed.enrolledAt === 'string' ? parsed.enrolledAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Creates a compact, content-resistant spectral signature. The profile is for
 * conversational speaker filtering only; it is not authentication and stores
 * no raw microphone audio.
 */
export function extractVoiceFeatureVector(
  spectrum: Uint8Array,
  sampleRate: number,
  fftSize: number,
): number[] | null {
  if (spectrum.length === 0 || sampleRate <= 0 || fftSize <= 0) return null;
  const minHz = 120;
  const maxHz = Math.min(4200, sampleRate / 2);
  const logMin = Math.log(minHz);
  const logMax = Math.log(maxHz);
  const bands: number[] = [];

  for (let band = 0; band < VOICE_IDENTITY_VECTOR_SIZE; band += 1) {
    const startHz = Math.exp(logMin + (logMax - logMin) * (band / VOICE_IDENTITY_VECTOR_SIZE));
    const endHz = Math.exp(logMin + (logMax - logMin) * ((band + 1) / VOICE_IDENTITY_VECTOR_SIZE));
    const startBin = clamp(Math.floor(startHz * fftSize / sampleRate), 0, spectrum.length - 1);
    const endBin = clamp(Math.ceil(endHz * fftSize / sampleRate), startBin + 1, spectrum.length);
    let power = 0;
    for (let bin = startBin; bin < endBin; bin += 1) {
      const amplitude = spectrum[bin] / 255;
      power += amplitude * amplitude;
    }
    bands.push(Math.log1p(power / Math.max(1, endBin - startBin)));
  }

  const mean = bands.reduce((sum, value) => sum + value, 0) / bands.length;
  const centered = bands.map(value => value - mean);
  const magnitude = Math.sqrt(centered.reduce((sum, value) => sum + value * value, 0));
  if (magnitude < 0.015) return null;
  return centered.map(value => value / magnitude);
}

export function createVoiceIdentityProfile(vectors: number[][]): VoiceIdentityProfile | null {
  const aggregate = aggregateVoiceVectors(vectors, 24);
  if (!aggregate) return null;
  const { valid, centroid: normalized } = aggregate;
  const similarities = valid.map(vector => cosineSimilarity(normalized, vector));
  const meanSimilarity = similarities.reduce((sum, value) => sum + value, 0) / similarities.length;
  const threshold = clamp(meanSimilarity - 0.12, 0.78, 0.92);
  return {
    version: 1,
    enabled: true,
    centroid: normalized,
    threshold,
    sampleCount: valid.length,
    enrolledAt: new Date().toISOString(),
  };
}

function aggregateVoiceVectors(vectors: number[][], minimumSamples: number) {
  const valid = vectors.filter(vector => vector.length === VOICE_IDENTITY_VECTOR_SIZE && vector.every(Number.isFinite));
  if (valid.length < minimumSamples) return null;
  const centroid = Array.from({ length: VOICE_IDENTITY_VECTOR_SIZE }, (_, index) =>
    valid.reduce((sum, vector) => sum + vector[index], 0) / valid.length,
  );
  const magnitude = Math.sqrt(centroid.reduce((sum, value) => sum + value * value, 0));
  if (magnitude < 0.01) return null;
  const normalized = centroid.map(value => value / magnitude);
  return { valid, centroid: normalized };
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) return -1;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return -1;
  return dot / Math.sqrt(leftMagnitude * rightMagnitude);
}

export function scoreVoiceIdentity(profile: VoiceIdentityProfile, vectors: number[][]): number | null {
  // A normal turn is shorter than the enrollment sample. Eight voiced frames
  // is enough for a conservative comparison while very short interjections
  // remain unfiltered instead of being falsely rejected.
  const candidate = aggregateVoiceVectors(vectors, 8);
  return candidate ? cosineSimilarity(profile.centroid, candidate.centroid) : null;
}

export function isEnrolledSpeaker(profile: VoiceIdentityProfile, vectors: number[][]): boolean | null {
  const score = scoreVoiceIdentity(profile, vectors);
  return score === null ? null : score >= profile.threshold;
}
