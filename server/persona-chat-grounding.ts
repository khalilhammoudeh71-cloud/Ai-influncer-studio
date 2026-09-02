import {
  resolveCreatorPersona,
  type CreatorIdentityContext,
  type MediaPersonaContext,
} from './persona-media';
import {
  detectExplicitMediaCreationRequest,
  detectIncompleteMediaCreationRequest,
  isConversationalMediaCreationRemark,
} from '../shared/personaMediaIntent';

type CreatorProfile = CreatorIdentityContext & Record<string, any>;

export interface PersonaChatIdentityInput {
  activePersona?: MediaPersonaContext | null;
  requestedCreator?: CreatorProfile | null;
  storedCreator?: CreatorProfile | null;
  savedPersonas?: MediaPersonaContext[] | null;
  requestedUserName?: unknown;
  fallbackName?: string;
}

export interface PersonaChatIdentity {
  creatorName: string;
  creatorProfile: CreatorProfile;
  creatorPersona?: MediaPersonaContext;
}

function normalizeIdentityName(value: unknown): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bhasan\b/g, 'hassan')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSameNamedIdentity(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeIdentityName(left);
  const normalizedRight = normalizeIdentityName(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;

  const leftFirst = normalizedLeft.split(' ')[0];
  const rightFirst = normalizedRight.split(' ')[0];
  return leftFirst.length >= 3 && leftFirst === rightFirst;
}

/**
 * A current browser creator profile is sufficient for latency-sensitive voice
 * turns when it names someone other than the active persona. Database fallback
 * remains mandatory for missing or self-conflicting identity data.
 */
export function hasDistinctRequestedCreatorIdentity(input: {
  activePersona?: MediaPersonaContext | null;
  requestedCreator?: CreatorProfile | null;
  requestedUserName?: unknown;
}): boolean {
  const candidates = [input.requestedCreator?.name, input.requestedUserName];
  return candidates.some(candidate => (
    String(candidate || '').trim().length > 0
    && !isSameNamedIdentity(candidate, input.activePersona?.name)
  ));
}

function isActivePersona(persona: MediaPersonaContext | undefined, activePersona?: MediaPersonaContext | null): boolean {
  if (!persona || !activePersona) return false;
  if (persona.id && activePersona.id && persona.id === activePersona.id) return true;
  return isSameNamedIdentity(persona.name, activePersona.name);
}

/**
 * Resolves the human creator independently from the active persona. The saved
 * account profile and explicitly linked creator persona are authoritative; a
 * stale browser profile must never make a persona believe that the creator has
 * the persona's own name.
 */
export function resolvePersonaChatIdentity(input: PersonaChatIdentityInput): PersonaChatIdentity {
  const savedPersonas = Array.isArray(input.savedPersonas) ? input.savedPersonas : [];
  const mergedProfile: CreatorProfile = {
    ...(input.requestedCreator || {}),
    ...(input.storedCreator || {}),
  };

  let creatorPersona = resolveCreatorPersona(savedPersonas, mergedProfile);
  if (isActivePersona(creatorPersona, input.activePersona)) {
    creatorPersona = resolveCreatorPersona(
      savedPersonas.filter(persona => !isActivePersona(persona, input.activePersona)),
      null,
    );
  }

  const candidates = [
    creatorPersona?.name,
    input.storedCreator?.name,
    input.requestedCreator?.name,
    input.requestedUserName,
    input.fallbackName || 'Creator',
  ];
  const creatorName = String(candidates.find(candidate => (
    String(candidate || '').trim()
    && !isSameNamedIdentity(candidate, input.activePersona?.name)
  )) || 'Creator').trim();

  const creatorReference = creatorPersona?.referenceImage
    || creatorPersona?.avatar
    || creatorPersona?.alternateReferenceImage
    || creatorPersona?.additionalReferenceImages?.[0];
  const existingPhotos = Array.isArray(mergedProfile.photos) ? mergedProfile.photos : [];
  const creatorPhotos = creatorReference && !existingPhotos.includes(creatorReference)
    ? [creatorReference, ...existingPhotos]
    : existingPhotos;

  return {
    creatorName,
    creatorPersona,
    creatorProfile: {
      ...mergedProfile,
      name: creatorName,
      ...(creatorPersona?.id ? { ownerPersonaId: creatorPersona.id } : {}),
      ...(creatorPersona?.faceDescriptor ? { appearance: creatorPersona.faceDescriptor } : {}),
      ...(creatorReference ? { primaryPhoto: creatorReference, photos: creatorPhotos } : {}),
    },
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Repairs only vocative self-name mistakes (for example, a reply from Leen
 * beginning with "Leen, ..."). Ordinary first-person references to the
 * persona remain untouched.
 */
export function sanitizePersonaSelfAddress(
  value: unknown,
  personaName: unknown,
  creatorName: unknown,
): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';

  const fullPersonaName = String(personaName || '').trim();
  const variants = Array.from(new Set([
    fullPersonaName,
    fullPersonaName.split(/\s+/)[0],
  ].filter(name => name.length >= 3))).sort((left, right) => right.length - left.length);
  if (variants.length === 0) return raw;

  const personaPattern = variants.map(escapeRegExp).join('|');
  const creator = String(creatorName || '').trim();
  const safeCreator = creator && !isSameNamedIdentity(creator, fullPersonaName) && normalizeIdentityName(creator) !== 'creator'
    ? creator
    : '';
  const replacement = safeCreator ? `${safeCreator}, ` : '';

  let cleaned = raw.replace(
    new RegExp(`^\\s*(?:${personaPattern})\\s*(?:[,!:\u2026]|\\.{2,}|[-\u2013\u2014])+\\s*`, 'i'),
    replacement,
  );
  cleaned = cleaned.replace(
    new RegExp(`^(\\s*(?:hey|hi|okay|ok|mm|um|well|wait)[,!\u2026.\\s-]+)(?:${personaPattern})\\s*(?:[,!:\u2026]|\\.{2,}|[-\u2013\u2014])+\\s*`, 'i'),
    (_, opening: string) => `${opening}${replacement}`,
  );
  cleaned = cleaned.replace(
    new RegExp(`([.!?]\\s+)(?:${personaPattern})\\s*((?:[,!:\u2026]|\\.{2,}|[-\u2013\u2014])+)\\s*`, 'gi'),
    (_, sentenceStart: string, punctuation: string) => safeCreator
      ? `${sentenceStart}${safeCreator}${punctuation} `
      : sentenceStart,
  );
  cleaned = cleaned.replace(
    new RegExp(`([,;]\\s*)(?:${personaPattern})(?=\\s*(?:[,.!?\u2026]|[-\u2013\u2014]|$))`, 'gi'),
    (_, separator: string) => safeCreator ? `${separator}${safeCreator}` : separator,
  );
  return cleaned.trim();
}

export type PersonaMediaAction = { type: 'image' | 'video'; prompt: string };

export interface PersonaMediaConversationMessage {
  role?: unknown;
  type?: unknown;
  content?: unknown;
}

function isConversationalMediaRemark(prompt: string): boolean {
  return isConversationalMediaCreationRemark(prompt);
}

function isLikelyMediaClarificationAnswer(prompt: string, type: 'image' | 'video'): boolean {
  if (/[?]/.test(prompt) || /\b(?:never mind|nevermind|forget it|cancel that|actually,?\s+(?:don't|do not))\b/i.test(prompt)) {
    return false;
  }
  if (/^(?:quick check|tell me|answer|reply|what(?:'s| is)|who|why|how|when|where|can you|could you|would you|let'?s)\b/i.test(prompt.trim())) {
    return false;
  }

  const mediaNoun = type === 'video'
    ? /\b(?:video|clip|reel|animation|movie|footage)\b/i
    : /\b(?:image|photo|picture|pic|portrait|selfie|headshot|avatar|shot)\b/i;
  if (mediaNoun.test(prompt)) return true;

  const visualDescription = /\b(?:standing|sitting|seated|kneeling|walking|running|dancing|wearing|dressed|posing|looking at (?:the )?camera|close[- ]?up|waist[- ]?up|full[- ]?body|from behind|outdoors?|indoors?|daylight|sunset|sunrise|background|foreground|scene|camera|bedroom|beach|gym|window|street|studio|lighting)\b/i;
  if (type === 'image') return visualDescription.test(prompt);

  const motionDescription = /\b(?:speaking|talking|singing|turning|moving|waving|smiling|laughing|walking|running|dancing|camera pans?|camera moves?|slow motion|seconds? long|cinematic)\b/i;
  return visualDescription.test(prompt) || motionDescription.test(prompt);
}

/**
 * A creation verb plus only a media noun is an intent to create, not a usable
 * generation prompt. Starting a provider job here produces an arbitrary image
 * before the user has described the subject, scene, or composition.
 */
export function detectIncompletePersonaMediaRequest(value: unknown): 'image' | 'video' | undefined {
  const prompt = typeof value === 'string' ? value.trim() : '';
  if (!prompt || isConversationalMediaRemark(prompt)) return undefined;
  return detectIncompleteMediaCreationRequest(prompt);
}

/**
 * Detects explicit requests for a new media asset before a conversational
 * model is called. This keeps the media provider's result authoritative and
 * prevents a model-authored refusal from contradicting a successful job.
 */
export function detectExplicitPersonaMediaRequest(value: unknown): PersonaMediaAction | undefined {
  const prompt = typeof value === 'string' ? value.trim() : '';
  if (!prompt) return undefined;

  if (isConversationalMediaRemark(prompt) || detectIncompletePersonaMediaRequest(prompt)) return undefined;
  const type = detectExplicitMediaCreationRequest(prompt);
  return type ? { type, prompt } : undefined;
}

/**
 * Resolves either a complete request in the current turn or the immediate
 * answer to our own media-clarification question. The clarification must be
 * the directly preceding dialogue line so an older question cannot revive a
 * stale image request.
 */
export function resolvePersonaMediaRequest(
  value: unknown,
  history?: PersonaMediaConversationMessage[] | null,
): PersonaMediaAction | undefined {
  const prompt = typeof value === 'string' ? value.trim() : '';
  if (!prompt || isConversationalMediaRemark(prompt) || detectIncompletePersonaMediaRequest(prompt)) {
    return undefined;
  }

  const directRequest = detectExplicitPersonaMediaRequest(prompt);
  if (directRequest) return directRequest;

  const normalizedPrompt = prompt.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalizedPrompt || /^(?:yes|yeah|yep|okay|ok|sure|no|nope|what|huh|do what|go ahead)$/.test(normalizedPrompt)) {
    return undefined;
  }

  const dialogue = (Array.isArray(history) ? history : [])
    .filter(message => {
      const type = String(message?.type || 'text').toLowerCase();
      const role = String(message?.role || '').toLowerCase();
      return type === 'text'
        && ['user', 'assistant', 'model', 'persona'].includes(role)
        && String(message?.content || '').trim();
    })
    .map(message => ({
      role: String(message.role || '').toLowerCase(),
      content: String(message.content || '').trim(),
    }));

  while (
    dialogue.length > 0
    && dialogue.at(-1)?.role === 'user'
    && dialogue.at(-1)?.content.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim() === normalizedPrompt
  ) {
    dialogue.pop();
  }

  const previous = dialogue.at(-1);
  if (!previous || !['assistant', 'model', 'persona'].includes(previous.role)) return undefined;

  const clarificationType = /\bwhat (?:kind|type) of (?:video|clip|reel|animation)\b|\bwhat should (?:be|happen) in (?:the|your) (?:video|clip)\b/i.test(previous.content)
    ? 'video'
    : /\bwhat (?:kind|type) of (?:image|photo|picture|pic|portrait)\b|\bwhat should be in (?:the|your) (?:image|photo|picture)\b/i.test(previous.content)
      ? 'image'
      : undefined;
  return clarificationType && isLikelyMediaClarificationAnswer(prompt, clarificationType)
    ? { type: clarificationType, prompt }
    : undefined;
}
