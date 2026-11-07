export type MediaIdentityVerdict = 'match' | 'mismatch' | 'uncertain';

export interface MediaIdentityCheck {
  name: string;
  present: boolean | null;
  verdict: MediaIdentityVerdict;
  confidence: number | null;
}

export type MediaPromptCriterion = 'pose' | 'setting' | 'gaze' | 'wardrobe' | 'lighting' | 'framing' | 'text';
export type ReviewStatus = 'passed'|'failed'|'unavailable';
export interface TemporalIdentityCheck {name:string;segment:'beginning'|'middle'|'end';verdict:MediaIdentityVerdict;confidence:number|null;faceVisible:boolean|null}

export interface MediaPromptFidelityCheck {
  criterion: MediaPromptCriterion;
  applicable: boolean;
  satisfied: boolean | null;
  confidence: number | null;
}

export interface MediaQualityReport {
  status: 'passed' | 'failed' | 'unavailable';
  identityStatus?: ReviewStatus;
  expressionStatus?: ReviewStatus|'not-requested';
  expressionCheck?: {satisfied:boolean|null;confidence:number|null};
  sceneStatus?: ReviewStatus|'not-requested';
  temporalStatus?: ReviewStatus|'not-requested';
  temporalChecks?: TemporalIdentityCheck[];
  expectedParticipantCount: number;
  observedParticipantCount: number | null;
  countConfidence: number | null;
  identities: MediaIdentityCheck[];
  promptFidelity: MediaPromptFidelityCheck[];
  reasons: string[];
  attempt: number;
  checkedAt: string;
}

function clampConfidence(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if(typeof value!=='number')return null;
  const parsed = value;
  if (!Number.isFinite(parsed) || parsed<0 || parsed>1) return null;
  return parsed;
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
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function unavailableMediaQualityReport(expectedNames: string[], reason: string, attempt = 1): MediaQualityReport {
  return {
    status: 'unavailable',
    identityStatus:'unavailable',sceneStatus:'unavailable',
    expectedParticipantCount: expectedNames.length,
    observedParticipantCount: null,
    countConfidence: null,
    identities: expectedNames.map(name => ({ name, present: null, verdict: 'uncertain', confidence: null })),
    promptFidelity: [],
    reasons: [reason],
    attempt,
    checkedAt: new Date().toISOString(),
  };
}

export function parseMediaQualityReport(raw: string, expectedNames: string[], attempt = 1, options:{strictFidelity?:boolean;video?:boolean;expressionRequested?:boolean}={}): MediaQualityReport {
  const parsed = parseJsonObject(raw);
  if (!parsed) return unavailableMediaQualityReport(expectedNames, 'The visual checker returned an unreadable result.', attempt);

  const hasObservedCount = parsed.observedParticipantCount !== null
    && parsed.observedParticipantCount !== undefined
    && parsed.observedParticipantCount !== '';
  const rawObserved = typeof parsed.observedParticipantCount==='number'?parsed.observedParticipantCount:NaN;
  const observedParticipantCount = hasObservedCount && Number.isInteger(rawObserved) && rawObserved >= 0 && rawObserved <= 20
    ? rawObserved
    : null;
  const countConfidence = clampConfidence(parsed.countConfidence);
  const rawIdentities = Array.isArray(parsed.identities) ? parsed.identities : [];
  const identities = expectedNames.map(expectedName => {
    const expectedKey = normalizeName(expectedName);
    const matches = rawIdentities.filter(value => {
      if (!value || typeof value !== 'object') return false;
      return normalizeName(String((value as Record<string, unknown>).name || '')) === expectedKey;
    }) as Record<string, unknown>[];
    const match=matches.length===1?matches[0]:undefined;
    const rawPresent = match?.present;
    return {
      name: expectedName,
      present: typeof rawPresent === 'boolean' ? rawPresent : null,
      verdict: normalizeVerdict(match?.verdict),
      confidence: clampConfidence(match?.confidence),
    } satisfies MediaIdentityCheck;
  });
  const allowedCriteria = new Set<MediaPromptCriterion>(['pose', 'setting', 'gaze', 'wardrobe', 'lighting', 'framing', 'text']);
  const rawPromptFidelity = Array.isArray(parsed.promptFidelity) ? parsed.promptFidelity : [];
  const promptFidelity = rawPromptFidelity.flatMap(value => {
    if (!value || typeof value !== 'object') return [];
    const entry = value as Record<string, unknown>;
    const criterion = String(entry.criterion || '').trim().toLowerCase() as MediaPromptCriterion;
    if (!allowedCriteria.has(criterion)) return [];
    const rawSatisfied = entry.satisfied;
    return [{
      criterion,
      applicable: entry.applicable === true,
      satisfied: typeof rawSatisfied === 'boolean' ? rawSatisfied : null,
      confidence: clampConfidence(entry.confidence),
    } satisfies MediaPromptFidelityCheck];
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
  const identityReasons=[...reasons];
  const sceneReasons:string[]=[];
  for (const check of options.strictFidelity===false?[]:promptFidelity) {
    if (check.applicable && check.satisfied === false && (check.confidence || 0) >= 0.82) {
      sceneReasons.push(`The requested ${check.criterion} was not followed.`);
    }
  }

  const countConclusive = observedParticipantCount !== null && (countConfidence || 0) >= 0.75;
  const identitiesConclusive = expectedNames.length>0 && new Set(expectedNames.map(normalizeName)).size===expectedNames.length && identities.every(identity =>
    identity.present === true
    && identity.verdict === 'match'
    && (identity.confidence || 0) >= 0.75,
  );
  const applicablePromptChecks = promptFidelity.filter(check => check.applicable);
  const completeSceneChecklist=rawPromptFidelity.length===7 && promptFidelity.length===7 && new Set(promptFidelity.map(x=>x.criterion)).size===7 && rawPromptFidelity.every((x:any)=>typeof x?.applicable==='boolean');
  const promptFidelityConclusive = completeSceneChecklist && applicablePromptChecks.every(check =>
    check.satisfied === true && (check.confidence || 0) >= 0.72,
  );
  const rawTemporalChecks=Array.isArray(parsed.temporalChecks)?parsed.temporalChecks:[];
  const temporalChecks:TemporalIdentityCheck[]=rawTemporalChecks.flatMap((x:any)=>{
    if(!x || !expectedNames.includes(x.name) || !['beginning','middle','end'].includes(x.segment))return [];
    return [{name:x.name,segment:x.segment,verdict:normalizeVerdict(x.verdict),confidence:clampConfidence(x.confidence),faceVisible:typeof x.faceVisible==='boolean'?x.faceVisible:null}];
  });
  let temporalStatus:ReviewStatus|'not-requested'='not-requested';
  if(options.video){
    const drift=temporalChecks.filter(x=>x.verdict==='mismatch'&&(x.confidence||0)>=0.82);
    const complete=rawTemporalChecks.length===expectedNames.length*3 && temporalChecks.length===expectedNames.length*3 && expectedNames.every(name=>['beginning','middle','end'].every(segment=>temporalChecks.filter(x=>x.name===name&&x.segment===segment).length===1));
    temporalStatus=drift.length?'failed':complete&&temporalChecks.every(x=>x.faceVisible===true&&x.verdict==='match'&&(x.confidence||0)>=0.75)?'passed':'unavailable';
    for(const x of drift)identityReasons.push(`${x.name} changes identity in the ${x.segment} of the video.`);
    if(temporalStatus==='unavailable'){
      identityReasons.push('Video identity could not be confirmed across the beginning, middle and end.');
      if(!complete)identityReasons.push('Segment evidence was missing or inconsistent.');
      else for(const x of temporalChecks.filter(x=>x.faceVisible!==true||x.verdict!=='match'||(x.confidence||0)<0.75))identityReasons.push(x.faceVisible!==true?`${x.name}'s face was not clearly visible in the ${x.segment} segment.`:`${x.name}'s ${x.segment} segment did not establish a conclusive face match.`);
    }
  }
  const identityStatus:ReviewStatus=reasons.length>0||temporalStatus==='failed'?'failed':countConclusive&&identitiesConclusive&&(!options.video||temporalStatus==='passed')?'passed':'unavailable';
  if(identityStatus==='unavailable'&&!identityReasons.length)identityReasons.push('The face match or participant count could not be confirmed.');
  const sceneStatus:ReviewStatus|'not-requested'=options.strictFidelity===false?'not-requested':sceneReasons.length?'failed':promptFidelityConclusive?'passed':'unavailable';
  if(sceneStatus==='unavailable'){
    if(!completeSceneChecklist)sceneReasons.push('The scene checklist was incomplete or contained duplicate criteria.');
    for(const x of applicablePromptChecks.filter(x=>x.satisfied!==true||(x.confidence||0)<0.72))sceneReasons.push(`The requested ${x.criterion} could not be confirmed.`);
  }
  const rawExpression=parsed.expressionCheck;
  const expressionEntry=rawExpression && typeof rawExpression==='object' && !Array.isArray(rawExpression)?rawExpression as Record<string,unknown>:{};
  const expressionCheck={satisfied:typeof expressionEntry.satisfied==='boolean'?expressionEntry.satisfied:null,confidence:clampConfidence(expressionEntry.confidence)};
  const expressionStatus:ReviewStatus|'not-requested'=!options.expressionRequested?'not-requested':expressionCheck.satisfied===false&&(expressionCheck.confidence||0)>=0.82?'failed':expressionCheck.satisfied===true&&(expressionCheck.confidence||0)>=0.72?'passed':'unavailable';
  if(expressionStatus==='failed')sceneReasons.push('The requested facial expression was not followed.');
  if(expressionStatus==='unavailable')sceneReasons.push('The requested facial expression could not be confirmed.');
  const status:ReviewStatus=identityStatus==='failed'||sceneStatus==='failed'||expressionStatus==='failed'?'failed':identityStatus==='passed'&&(sceneStatus==='passed'||sceneStatus==='not-requested')&&(expressionStatus==='passed'||expressionStatus==='not-requested')?'passed':'unavailable';
  const combinedReasons=[...identityReasons,...sceneReasons];
  return {
    status,
    identityStatus,sceneStatus,temporalStatus,temporalChecks,expressionStatus,expressionCheck,
    expectedParticipantCount: expectedNames.length,
    observedParticipantCount,
    countConfidence,
    identities,
    promptFidelity,
    reasons: combinedReasons.length > 0
      ? combinedReasons
      : status === 'passed'
        ? ['Participant count and visible identities passed the confidence threshold.']
        : ['The visual check was inconclusive.'],
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
    'Treat the original request as a visual checklist. Correct every failed expression, pose, setting, gaze, wardrobe, lighting, framing, and text requirement without changing details that already passed.',
    failureSummary ? `Correct these detected problems: ${failureSummary}` : '',
  ].filter(Boolean).join('\n');
}
