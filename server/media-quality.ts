export type MediaIdentityVerdict = 'match' | 'mismatch' | 'uncertain';

export interface MediaIdentityCheck {
  name: string;
  present: boolean | null;
  verdict: MediaIdentityVerdict;
  confidence: number | null;
}

export interface MediaQualityReport {
  status: 'passed' | 'failed' | 'unavailable';
  expectedParticipantCount: number;
  observedParticipantCount: number | null;
  countConfidence: number | null;
  identities: MediaIdentityCheck[];
  reasons: string[];
  attempt: number;
  checkedAt: string;
}

function clampConfidence(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(1, parsed));
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || trimmed.match(/\{[\s\S]*\}/)?.[0] || trimmed;
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function normalizeVerdict(value: unknown): MediaIdentityVerdict {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'match' || normalized === 'matched') return 'match';
  if (normalized === 'mismatch' || normalized === 'not_match' || normalized === 'not-match') return 'mismatch';
  return 'uncertain';
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function unavailableMediaQualityReport(expectedNames: string[], reason: string, attempt = 1): MediaQualityReport {
  return {
    status: 'unavailable',
    expectedParticipantCount: expectedNames.length,
    observedParticipantCount: null,
    countConfidence: null,
    identities: expectedNames.map(name => ({ name, present: null, verdict: 'uncertain', confidence: null })),
    reasons: [reason],
    attempt,
    checkedAt: new Date().toISOString(),
  };
}

export function parseMediaQualityReport(raw: string, expectedNames: string[], attempt = 1): MediaQualityReport {
  const parsed = parseJsonObject(raw);
  if (!parsed) return unavailableMediaQualityReport(expectedNames, 'The visual checker returned an unreadable result.', attempt);

  const hasObservedCount = parsed.observedParticipantCount !== null
    && parsed.observedParticipantCount !== undefined
    && parsed.observedParticipantCount !== '';
  const rawObserved = Number(parsed.observedParticipantCount);
  const observedParticipantCount = hasObservedCount && Number.isInteger(rawObserved) && rawObserved >= 0 && rawObserved <= 20
    ? rawObserved
    : null;
  const countConfidence = clampConfidence(parsed.countConfidence);
  const rawIdentities = Array.isArray(parsed.identities) ? parsed.identities : [];
  const identities = expectedNames.map(expectedName => {
    const expectedKey = normalizeName(expectedName);
    const match = rawIdentities.find(value => {
      if (!value || typeof value !== 'object') return false;
      return normalizeName(String((value as Record<string, unknown>).name || '')) === expectedKey;
    }) as Record<string, unknown> | undefined;
    const rawPresent = match?.present;
    return {
      name: expectedName,
      present: typeof rawPresent === 'boolean' ? rawPresent : null,
      verdict: normalizeVerdict(match?.verdict),
      confidence: clampConfidence(match?.confidence),
    } satisfies MediaIdentityCheck;
  });

  const reasons: string[] = [];
  const countMismatch = observedParticipantCount !== null
    && countConfidence !== null
    && countConfidence >= 0.75
    && observedParticipantCount !== expectedNames.length;
  if (countMismatch) {
    reasons.push(`Expected ${expectedNames.length} people but confidently detected ${observedParticipantCount}.`);
  }

  for (const identity of identities) {
    const confidentlyMissing = identity.present === false && (identity.confidence || 0) >= 0.8;
    const confidentlyWrong = identity.verdict === 'mismatch' && (identity.confidence || 0) >= 0.82;
    if (confidentlyMissing) reasons.push(`${identity.name} is not clearly present.`);
    else if (confidentlyWrong) reasons.push(`${identity.name} does not sufficiently match the saved reference.`);
  }

  const countConclusive = observedParticipantCount !== null && (countConfidence || 0) >= 0.75;
  const identitiesConclusive = identities.every(identity =>
    identity.present === true
    && identity.verdict === 'match'
    && (identity.confidence || 0) >= 0.75,
  );
  const status = reasons.length > 0
    ? 'failed'
    : countConclusive && identitiesConclusive
      ? 'passed'
      : 'unavailable';
  return {
    status,
    expectedParticipantCount: expectedNames.length,
    observedParticipantCount,
    countConfidence,
    identities,
    reasons: reasons.length > 0
      ? reasons
      : status === 'passed'
        ? ['Participant count and visible identities passed the confidence threshold.']
        : ['The visual check was inconclusive, so the provider result was preserved.'],
    attempt,
    checkedAt: new Date().toISOString(),
  };
}

export function buildMediaQualityRetryPrompt(
  originalPrompt: string,
  expectedNames: string[],
  report: MediaQualityReport,
): string {
  const identities = expectedNames.map((name, index) => `${index + 1}. ${name} must match reference image ${index + 1}.`).join('\n');
  const failureSummary = report.reasons.filter(Boolean).join(' ');
  return [
    originalPrompt.trim(),
    'AUTOMATIC QUALITY CORRECTION — the previous render did not pass the requested identity/composition check.',
    `Render exactly ${expectedNames.length} distinct people, no more and no fewer. Each person must appear once, with a clearly visible and recognizable face.`,
    identities,
    'Do not omit, duplicate, merge, swap, average, or replace any identity. Keep all requested people in the same frame and preserve the user-requested scene, action, clothing, pose, and setting.',
    failureSummary ? `Correct these detected problems: ${failureSummary}` : '',
  ].filter(Boolean).join('\n');
}
