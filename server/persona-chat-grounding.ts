import {
  resolveCreatorPersona,
  type CreatorIdentityContext,
  type MediaPersonaContext,
} from './persona-media';

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
  return /(?:why did you send|why are you sending|why do you keep sending|stop sending|do not send|don't send|not asking for|didn't ask for|do not want|don't want|what is that (?:photo|image|picture|video)|about (?:that|this|the) (?:photo|image|picture|video)|talk about (?:that|this|the)?\s*(?:photo|image|picture|video)|let'?s (?:just )?(?:talk|chat)|keep talking|continue talking)/i.test(prompt);
}

/**
 * A creation verb plus only a media noun is an intent to create, not a usable
 * generation prompt. Starting a provider job here produces an arbitrary image
 * before the user has described the subject, scene, or composition.
 */
export function detectIncompletePersonaMediaRequest(value: unknown): 'image' | 'video' | undefined {
  const prompt = typeof value === 'string' ? value.trim() : '';
  if (!prompt || isConversationalMediaRemark(prompt)) return undefined;

  const match = prompt.match(
    /\b(?:generate|create|make|render|produce)\s+(?:me\s+)?(?:(?:a|an|the|some|another|new)\s+)*(image|photo|picture|pic|portrait|video|clip|reel|animation)\b([\s\S]*)$/i,
  );
  if (!match) return undefined;

  const remainder = String(match[2] || '')
    .toLowerCase()
    .replace(/[.,!?;:]+/g, ' ')
    .replace(/\b(?:please|for me|for us|right now|now|quickly|real quick|if you can|if you could)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (remainder && !/^(?:of|with|showing|featuring)$/.test(remainder)) return undefined;

  return /^(?:video|clip|reel|animation)$/i.test(match[1]) ? 'video' : 'image';
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

  const videoRequest = (
    /\b(?:send|record|make|generate|shoot|create|render|show|give)\s+(?:me\s+)?(?:a\s+|an\s+|another\s+|the\s+|some\s+|your\s+)?(?:new\s+)?(?:video|clip|reel|animation)\b/i.test(prompt)
    || /\b(?:want|need|would like|i'?d like|can i (?:get|have|see)|could i (?:get|have|see))\b[^.!?]{0,100}\b(?:video|clip|reel|animation)\b/i.test(prompt)
    || /\banimate\s+(?:this|that|it)\b/i.test(prompt)
  );
  if (videoRequest) return { type: 'video', prompt };

  const imageRequest = (
    /\b(?:send|take|show|give|snap|shoot|make|generate|post|create|share|render)\s+(?:me\s+)?(?:a\s+|an\s+|another\s+|the\s+|some\s+|your\s+)?(?:new\s+)?(?:one|pic|pics|photo|photos|picture|pictures|image|images|selfie|selfies|shot|portrait|headshot|avatar|profile image|profile pic|profile photo|outfit|look)\b/i.test(prompt)
    || /\b(?:want|need|would like|i'?d like|can i (?:get|have|see)|could i (?:get|have|see)|let me see)\b[^.!?]{0,120}\b(?:pic|photo|picture|image|selfie|shot|portrait|headshot|avatar|profile image|profile pic|profile photo)\b/i.test(prompt)
    || /\b(?:profile image|profile pic|profile photo|portrait|headshot|selfie|photo|picture|image)\b[^.!?]{0,80}\b(?:please|now|nude|naked|topless|wearing|dressed|exposed)\b/i.test(prompt)
    || /^(?:another one|send another|another pic|another photo|new photo|new pic|send it|send it to me|send)$/i.test(prompt)
  );
  return imageRequest ? { type: 'image', prompt } : undefined;
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
  return clarificationType ? { type: clarificationType, prompt } : undefined;
}
