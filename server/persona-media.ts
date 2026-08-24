export interface MediaPersonaContext {
  id?: string;
  name?: string;
  niche?: string;
  bio?: string;
  visualStyle?: string;
  faceDescriptor?: string;
  referenceImage?: string;
  avatar?: string;
  alternateReferenceImage?: string;
  additionalReferenceImages?: string[];
  isCreator?: boolean;
  isOwner?: boolean;
}

export interface CreatorIdentityContext {
  ownerPersonaId?: string;
  personaId?: string;
  linkedPersonaId?: string;
  name?: string;
  appearance?: string;
  primaryPhoto?: string;
  photos?: string[];
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function containsPhrase(prompt: string, phrase: string): boolean {
  if (!phrase) return false;
  return ` ${normalizeForMatch(prompt)} `.includes(` ${normalizeForMatch(phrase)} `);
}

function normalizeCreatorReferencePrompt(prompt: string): string {
  const normalized = normalizeForMatch(
    prompt
      .replace(/&/g, ' and ')
      .replace(/\bw\s*\//gi, ' with '),
  );

  return normalized
    .split(' ')
    .map(token => {
      if (token === 'u') return 'you';
      if (token === 'ur') return 'your';
      return token;
    })
    .join(' ');
}

export function resolveMediaParticipants(
  prompt: string,
  activePersona: MediaPersonaContext,
  savedPersonas: MediaPersonaContext[],
  creatorPersona?: MediaPersonaContext,
): MediaPersonaContext[] {
  const byId = new Map<string, MediaPersonaContext>();
  const activeId = activePersona.id || `active:${normalizeForMatch(activePersona.name || 'persona')}`;
  byId.set(activeId, activePersona);

  const firstNameCounts = new Map<string, number>();
  for (const persona of savedPersonas) {
    const firstName = normalizeForMatch(persona.name || '').split(' ')[0];
    if (firstName) firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
  }

  for (const persona of savedPersonas) {
    const personaId = persona.id || `saved:${normalizeForMatch(persona.name || '')}`;
    if (personaId === activeId) continue;

    const fullName = normalizeForMatch(persona.name || '');
    const firstName = fullName.split(' ')[0];
    const fullNameMentioned = fullName.length >= 3 && containsPhrase(prompt, fullName);
    const uniqueFirstNameMentioned = firstName.length >= 3
      && firstNameCounts.get(firstName) === 1
      && containsPhrase(prompt, firstName);

    if (fullNameMentioned || uniqueFirstNameMentioned) byId.set(personaId, persona);
  }

  const creatorReferencePrompt = normalizeCreatorReferencePrompt(prompt);
  const referencesCreator = /\b(?:you\s+and\s+me|me\s+and\s+you|of\s+us|us\s+together|both\s+of\s+us|with\s+me|beside\s+me|next\s+to\s+me|holding\s+me|kissing\s+me|me\s+with\s+you|myself\s+and\s+you|you\s+and\s+myself|with\s+(?:the\s+)?creator|with\s+(?:the\s+)?owner)\b/i.test(creatorReferencePrompt);
  if (referencesCreator && creatorPersona) {
    const creatorId = creatorPersona.id || `creator:${normalizeForMatch(creatorPersona.name || 'owner')}`;
    if (creatorId !== activeId) byId.set(creatorId, creatorPersona);
  }

  return [...byId.values()];
}

export function resolveCreatorPersona(
  savedPersonas: MediaPersonaContext[],
  creatorProfile?: CreatorIdentityContext | null,
): MediaPersonaContext | undefined {
  const configuredId = creatorProfile?.ownerPersonaId || creatorProfile?.personaId || creatorProfile?.linkedPersonaId;
  if (configuredId) {
    const configured = savedPersonas.find(persona => persona.id === configuredId);
    if (configured) return configured;
  }

  const explicitlyOwned = savedPersonas.find(persona => persona.isCreator === true || persona.isOwner === true);
  if (explicitlyOwned) return explicitlyOwned;

  const drH = savedPersonas.find(persona => {
    const name = normalizeForMatch(persona.name || '');
    return name === 'dr h' || name === 'doctor h' || name === 'drh';
  });
  if (drH) return drH;

  if (creatorProfile?.name) {
    const byCreatorName = savedPersonas.find(persona => normalizeForMatch(persona.name || '') === normalizeForMatch(creatorProfile.name || ''));
    if (byCreatorName) return byCreatorName;
  }

  const profileReference = creatorProfile?.primaryPhoto || creatorProfile?.photos?.[0];
  if (profileReference) {
    return {
      id: configuredId || 'creator-profile-owner',
      name: creatorProfile?.name || 'Dr. H',
      faceDescriptor: creatorProfile?.appearance,
      referenceImage: profileReference,
      isCreator: true,
      isOwner: true,
    };
  }

  return undefined;
}

export function getPersonaPrimaryReference(persona: MediaPersonaContext): string | undefined {
  return persona.referenceImage || persona.avatar || persona.alternateReferenceImage || persona.additionalReferenceImages?.[0];
}

export function composeMultiPersonaPrompt(prompt: string, participants: MediaPersonaContext[]): string {
  if (participants.length <= 1) return prompt.trim();

  const identities = participants.map((persona, index) => {
    const details = [persona.name, persona.faceDescriptor, persona.visualStyle, persona.niche]
      .filter(Boolean)
      .join('; ');
    return `${index + 1}. ${details || `Persona ${index + 1}`} — match reference image ${index + 1}.`;
  });

  return [
    prompt.trim(),
    `MULTI-PERSONA COMPOSITION: Include exactly these ${participants.length} distinct adult personas together in the requested scene, each appearing once and remaining clearly recognizable:`,
    ...identities,
    'Preserve each person as a separate identity. Do not merge, swap, duplicate, or average their faces. Keep the requested interaction, pose, wardrobe, setting, and camera framing.',
  ].join('\n');
}
