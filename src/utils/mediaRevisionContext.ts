export interface GeneratedImageMessage {
  id: string;
  role?: string;
  type?: string;
  content?: string;
  prompt?: string;
  rootPrompt?: string;
  revisionHistory?: string[];
  participants?: string[];
  modelId?: string;
  modelName?: string;
}

export interface ImageRevisionContext {
  isRevision: boolean;
  prompt: string;
  source?: GeneratedImageMessage;
  rootPrompt?: string;
  revisionHistory?: string[];
}

const POLITE_EDIT_PREFIX = String.raw`(?:please\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+|will\s+you\s+|i\s+want\s+you\s+to\s+|let(?:'s|\s+us)\s+)?`;

const IMAGE_REVISION_LANGUAGE = [
  /\b(?:another|again|redo|retry|regenerate|recreate)\s+(?:image|photo|pic|picture|shot|one)\b/i,
  /\b(?:same|previous|last|original)\s+(?:image|photo|pic|picture|shot|scene|people|faces?)\b/i,
  /\b(?:this|that|the)\s+(?:image|photo|pic|picture|shot)\b/i,
  new RegExp(`^${POLITE_EDIT_PREFIX}(?:(?:only|just)\\s+)?(?:change|replace|remove|add|keep|retain|preserve|adjust|modify|edit|fix|correct|crop|reframe|zoom)\\b`, 'i'),
  /^(?:keep everything|leave everything|same faces?|exact faces?|profile (?:image|photo)s?|instead|make it)\b/i,
  new RegExp(`^${POLITE_EDIT_PREFIX}make\\b(?!\\s+(?:me\\s+)?(?:a\\s+|an\\s+|new\\s+)?(?:image|photo|pic|picture)\\b)`, 'i'),
  /^(?:more|less|closer|wider|brighter|darker|warmer|cooler)\b/i,
];

const CONVERSATIONAL_MEDIA_MENTION = [
  /\b(?:do\s+not|don't|dont|never)\s+(?:want|need)\s+(?:(?:an?|any|another|more|the)\s+)?(?:image|photo|pic|picture|selfie|video|clip)s?\b/i,
  /\b(?:do\s+not|don't|dont|never)\s+(?:send|make|generate|regenerate|create|recreate|redo|retry|edit|take|show|give|share)\b[^.!?]{0,40}\b(?:image|photo|pic|picture|selfie|video|clip)s?\b/i,
  /\b(?:stop|quit)\s+(?:sending|making|generating|creating|showing|sharing)\b[^.!?]{0,32}\b(?:image|photo|pic|picture|selfie|video|clip)s?\b/i,
  /\b(?:i(?:'m|\s+am)?\s+not|wasn't|weren't|we(?:'re|\s+are)\s+not)\s+(?:asking|requesting)\b[^.!?]{0,40}\b(?:image|photo|pic|picture|selfie|video|clip)s?\b/i,
  /\b(?:no\s+more|without\s+(?:an?|any|more))\s+(?:image|photo|pic|picture|selfie|video|clip)s?\b/i,
  /\b(?:why\s+(?:did|are|do)\s+you|what\s+is)\b[^.!?]{0,40}\b(?:image|photo|pic|picture|selfie|video|clip)s?\b/i,
  /\b(?:let(?:'s|\s+us))\s+(?:just\s+)?(?:talk|chat)\b/i,
];

export function isConversationalMediaMention(instruction: string): boolean {
  const normalized = instruction.trim();
  return Boolean(normalized) && CONVERSATIONAL_MEDIA_MENTION.some(pattern => pattern.test(normalized));
}

export function findLatestGeneratedImage(messages: GeneratedImageMessage[]): GeneratedImageMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'persona' && message.type === 'image' && message.content) {
      return message;
    }
  }
  return undefined;
}

export function isImageRevisionRequest(instruction: string, hasPreviousImage: boolean): boolean {
  if (!hasPreviousImage) return false;
  const normalized = instruction.trim();
  if (!normalized) return false;
  if (isConversationalMediaMention(normalized)) return false;

  // A fully specified "new image" request starts a fresh generation unless the
  // creator also uses explicit continuation/edit language.
  if (/\b(?:brand[- ]new|completely new|start over)\b/i.test(normalized) &&
      !/\b(?:same|keep|preserve|previous|last|exact faces?)\b/i.test(normalized)) {
    return false;
  }

  return IMAGE_REVISION_LANGUAGE.some(pattern => pattern.test(normalized));
}

function buildRevisionPrompt(rootPrompt: string, revisionHistory: string[]): string {
  const numberedChanges = revisionHistory
    .map((change, index) => `${index + 1}. ${change}`)
    .join('\n');

  return [
    'Revise the immediately previous generated image using it as the visual composition reference.',
    `Original image request: ${rootPrompt}`,
    'Apply these requested changes in order:',
    numberedChanges,
    'Preserve every person, identity, face, pose, composition, setting, wardrobe detail, and visual quality from the previous image unless a change above explicitly says otherwise.',
    'Use the saved persona profile reference images to keep every face and identity accurate.',
  ].join('\n');
}

export function resolveImageRevisionContext(
  instruction: string,
  messages: GeneratedImageMessage[],
  preferredSource?: GeneratedImageMessage,
): ImageRevisionContext {
  const source = preferredSource?.content ? preferredSource : findLatestGeneratedImage(messages);
  if (!source || !isImageRevisionRequest(instruction, true)) {
    return { isRevision: false, prompt: instruction };
  }

  const rootPrompt = (source.rootPrompt || source.prompt || instruction).trim();
  const revisionHistory = [
    ...(Array.isArray(source.revisionHistory) ? source.revisionHistory : []),
    instruction.trim(),
  ].filter(Boolean).slice(-8);

  return {
    isRevision: true,
    prompt: buildRevisionPrompt(rootPrompt, revisionHistory),
    source,
    rootPrompt,
    revisionHistory,
  };
}
