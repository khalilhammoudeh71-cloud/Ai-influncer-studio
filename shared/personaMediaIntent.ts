export type IncompleteMediaRequestType = 'image' | 'video';
export type ExplicitMediaRequestType = 'image' | 'video';

const MEDIA_KIND = 'image|photo|picture|pic|portrait|selfie|headshot|avatar|video|clip|reel|animation';

/** Conversation about media, rejection of media, and ordinary relationship
 * language must never be interpreted as a request to create an asset. */
export function isConversationalMediaCreationRemark(value: unknown): boolean {
  const prompt = typeof value === 'string' ? value.trim() : '';
  if (!prompt) return false;
  return /(?:why did you send|why are you sending|why do you keep sending|stop sending|do not send|don't send|not asking for|didn't ask for|do not want(?:\s+(?:an?|another|any|more))?\s+(?:image|photo|picture|pic|selfie|video|clip)|don't want(?:\s+(?:an?|another|any|more))?\s+(?:image|photo|picture|pic|selfie|video|clip)|what is that (?:photo|image|picture|video)|about (?:that|this|the) (?:photo|image|picture|video)|talk about (?:that|this|the)?\s*(?:photo|image|picture|video)|let'?s (?:just )?(?:talk|chat)|keep talking|continue talking|never mind|nevermind|forget it|cancel that)/i.test(prompt);
}

function requestMatch(prompt: string): RegExpMatchArray | null {
  const patterns = [
    new RegExp(
      `\\b(?:generate|create|make|render|produce|send|show|give|take|share)\\s+(?:me\\s+)?(?:(?:a|an|the|some|another|new)\\s+)*(?<leading>[a-z0-9'" -]{0,80}?)\\b(?<kind>${MEDIA_KIND})\\b(?<trailing>[\\s\\S]*)$`,
      'i',
    ),
    new RegExp(
      `\\b(?:i\\s+)?(?:want|need|would\\s+like|would\\s+love|i['’]?d\\s+like|i['’]?d\\s+love|love)\\s+(?:to\\s+(?:see|get|have|receive)\\s+)?(?:(?:a|an|the|some|another|new)\\s+)*(?<leading>[a-z0-9'" -]{0,80}?)\\b(?<kind>${MEDIA_KIND})\\b(?<trailing>[\\s\\S]*)$`,
      'i',
    ),
    new RegExp(
      `\\b(?:can|could|may)\\s+i\\s+(?:see|get|have|receive)\\s+(?:(?:a|an|the|some|another|new)\\s+)*(?<leading>[a-z0-9'" -]{0,80}?)\\b(?<kind>${MEDIA_KIND})\\b(?<trailing>[\\s\\S]*)$`,
      'i',
    ),
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) return match;
  }
  return null;
}

function meaningfulMediaDetails(match: RegExpMatchArray): string {
  return `${match.groups?.leading || ''} ${match.groups?.trailing || ''}`
    .toLowerCase()
    .replace(/[.,!?;:]+/g, ' ')
    .replace(/\b(?:please|for me|for us|right now|now|quickly|real quick|if you can|if you could)\b/g, ' ')
    .replace(/\b(?:of|with|showing|featuring)\s+(?:you|u|me|us|yourself|myself|ourselves)\b/g, ' ')
    .replace(/\b(?:of|with|showing|featuring)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns a media type when the user has asked for an asset but has not given
 * enough subject, scene, appearance, or composition detail to generate it.
 */
export function detectIncompleteMediaCreationRequest(value: unknown): IncompleteMediaRequestType | undefined {
  const prompt = typeof value === 'string' ? value.trim() : '';
  if (!prompt || isConversationalMediaCreationRemark(prompt)) return undefined;

  const match = requestMatch(prompt);
  if (!match || meaningfulMediaDetails(match)) return undefined;

  return /^(?:video|clip|reel|animation)$/i.test(match.groups?.kind || '') ? 'video' : 'image';
}

/**
 * Detects an explicit request to create media only when the user actually
 * names an image or video asset. Relational phrases such as "I want to see
 * you" and "show me your body" remain conversation, not generation commands.
 */
export function detectExplicitMediaCreationRequest(value: unknown): ExplicitMediaRequestType | undefined {
  const prompt = typeof value === 'string' ? value.trim() : '';
  if (!prompt || isConversationalMediaCreationRemark(prompt) || detectIncompleteMediaCreationRequest(prompt)) return undefined;

  const match = requestMatch(prompt);
  if (!match) return undefined;
  return /^(?:video|clip|reel|animation)$/i.test(match.groups?.kind || '') ? 'video' : 'image';
}
