export interface VoiceConversationMessage {
  id?: string;
  role?: string;
  type?: string;
  content?: string;
  prompt?: string;
  source?: string;
  timestamp?: Date | string | number;
}

export interface VoiceConversationHistoryOptions {
  maxMessages?: number;
}

const GREETING_ONLY = /^(?:hey|hi|hello|hiya|yo|good (?:morning|afternoon|evening)|what'?s up|sup)$/i;
const SHORT_ACKNOWLEDGEMENT = /^(?:yeah|yes|yep|yup|okay|ok|sure|fine|right|alright|all right|mhm|mm-?hmm|uh-?huh|no|nope|nah|maybe|i guess|go ahead)$/i;
const SHARED_HISTORY_CLARIFICATION = /^(?:what|which)\s+(?:project|conversation|chat|call|plan|idea|trip|date|meeting|experiment|study|work)(?:\s+are\s+you\s+talking\s+about)?$/i;
const SHORT_CLARIFICATION = /^(?:what|huh|sorry|do what|what do you mean|what are you talking about|say what|say that again|come again|you can do what|why)$/i;
const ACTION_CLARIFICATION = /^(?:do what|you can do what|what are you talking about)$/i;
const SHARED_HISTORY_CLAIM = /(?:\b(?:our|the)\s+(?:last|previous|earlier|recent)\s+(?:project|conversation|chat|call|plan|idea|trip|date|meeting|experiment|study|work)\b|\b(?:we|you\s+and\s+i)\s+(?:talked|discussed|planned|worked|explored|studied|decided|agreed|created|started|did|went|met)\b|\bremember\s+(?:when|our|the\s+time)\b)/i;
const SHARED_HISTORY_SUBJECT = /\b(?:project|conversation|chat|call|plan|idea|trip|date|meeting|experiment|study|work)\b/i;
const ACTION_MEMORY = /\b(?:send|show|take|snap|generate|create|make|render|record|edit|change|remove|undress|strip|nude|naked|topless|image|photo|picture|selfie|video|clip)\b/i;
const EXPLICIT_ACTION_CLAIM = /\b(?:send|show|take|snap|generate|create|make|render|record|edit|change|remove|start|open|upload|download)\b/i;
const VAGUE_ACTION_CLAIM = /\b(?:do|doing|did|try|trying|ready)\s+(?:that|it|this|something|anything|out)\b/i;
const MEMORY_STOP_WORDS = new Set([
  'about', 'again', 'and', 'are', 'can', 'could', 'did', 'does', 'for', 'from', 'have', 'how',
  'just', 'like', 'mean', 'remember', 'said', 'say', 'that', 'the', 'this', 'was', 'were', 'what',
  'when', 'where', 'who', 'why', 'with', 'would', 'you', 'your',
]);

function normalizeTurn(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isUserRole(role: unknown): boolean {
  return String(role || '').toLowerCase() === 'user';
}

function isAssistantRole(role: unknown): boolean {
  return ['assistant', 'model', 'persona'].includes(String(role || '').toLowerCase());
}

function isDialogueMessage(message: VoiceConversationMessage): boolean {
  const content = String(message?.content || '').trim();
  const type = String(message?.type || 'text').toLowerCase();
  return Boolean(content) && type === 'text' && (isUserRole(message.role) || isAssistantRole(message.role));
}

export function isVoiceGreetingOnly(value: unknown): boolean {
  return GREETING_ONLY.test(normalizeTurn(value));
}

/**
 * Short social replies do not contain enough information to safely retrieve
 * old semantic memories. They may refer to the immediately preceding line in
 * the current call, but must never revive an older request by themselves.
 */
export function isContextUnsafeVoiceTurn(value: unknown): boolean {
  const normalized = normalizeTurn(value);
  if (!normalized) return true;
  return GREETING_ONLY.test(normalized)
    || SHORT_ACKNOWLEDGEMENT.test(normalized)
    || SHORT_CLARIFICATION.test(normalized)
    || SHARED_HISTORY_CLARIFICATION.test(normalized);
}

/**
 * Ultra-short clarifications and acknowledgements are common when speech
 * recognition drops a word or the user is reacting in real time. Letting a
 * generative model invent the missing object can turn "Do what?" into a made-up
 * request, then make "Yeah" look like consent to it. These replies deliberately
 * stay small, human, and grounded in only the immediately preceding call line.
 */
export function getGroundedShortVoiceReply(
  messages: VoiceConversationMessage[] | undefined,
  currentUserMessage: string,
): string | undefined {
  const normalizedCurrent = normalizeTurn(currentUserMessage);
  const clean = (Array.isArray(messages) ? messages : [])
    .filter(isDialogueMessage)
    .map(message => ({ ...message, content: String(message.content || '').trim() }));

  let currentIndex = clean.length;
  for (let index = clean.length - 1; index >= 0; index -= 1) {
    if (isUserRole(clean[index].role) && normalizeTurn(clean[index].content) === normalizedCurrent) {
      currentIndex = index;
      break;
    }
  }
  let previousAssistantIndex = -1;
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (isAssistantRole(clean[index].role)) {
      previousAssistantIndex = index;
      break;
    }
  }
  const previousAssistant = previousAssistantIndex >= 0 ? clean[previousAssistantIndex] : undefined;
  const previousLine = String(previousAssistant?.content || '').replace(/\s+/g, ' ').trim();

  if (SHORT_ACKNOWLEDGEMENT.test(normalizedCurrent)) {
    if (/^(?:no|nope|nah)$/.test(normalizedCurrent)) return 'Okay, no problem.';
    if (/^(?:maybe|i guess)$/.test(normalizedCurrent)) return 'That\'s fair.';
    return previousLine ? 'Okay.' : undefined;
  }

  if (SHARED_HISTORY_CLARIFICATION.test(normalizedCurrent)) {
    if (!previousLine) return 'Which one do you mean?';
    const earlierUserGrounding = clean
      .slice(0, previousAssistantIndex)
      .filter(message => isUserRole(message.role))
      .some(message => SHARED_HISTORY_SUBJECT.test(normalizeTurn(message.content)));
    if (SHARED_HISTORY_CLAIM.test(previousLine) && !earlierUserGrounding) {
      return "Sorry—I misspoke. There wasn't a project I should have referred to.";
    }
    return undefined;
  }

  if (!ACTION_CLARIFICATION.test(normalizedCurrent)) return undefined;
  if (!previousLine) return 'What do you mean?';

  if (!EXPLICIT_ACTION_CLAIM.test(previousLine) || VAGUE_ACTION_CLAIM.test(previousLine)) {
    return "Nothing—I wasn't asking you to do anything.";
  }

  const restatement = previousLine
    .replace(/^(?:oh|um|uh|well|okay|ok|sorry)[,\s.…-]*/i, '')
    .slice(0, 180)
    .trim();
  if (!restatement) return 'What do you mean?';
  const naturalRestatement = /^I\b/.test(restatement)
    ? restatement
    : `${restatement.charAt(0).toLowerCase()}${restatement.slice(1)}`;
  return `I meant ${naturalRestatement}`;
}

/**
 * Long-term memory is recalled only when it overlaps with the current turn.
 * One-time media/action commands are never treated as durable persona facts.
 */
export function selectRelevantVoiceMemories(
  memories: unknown,
  currentUserMessage: string,
  limit = 4,
): string[] {
  if (!Array.isArray(memories) || isContextUnsafeVoiceTurn(currentUserMessage)) return [];
  const queryTerms = normalizeTurn(currentUserMessage)
    .split(' ')
    .filter(term => term.length >= 3 && !MEMORY_STOP_WORDS.has(term));
  if (queryTerms.length === 0) return [];

  return memories
    .map(memory => String((memory as { content?: unknown })?.content || memory || '').trim())
    .filter(memory => memory && !ACTION_MEMORY.test(memory))
    .filter(memory => {
      const normalizedMemory = normalizeTurn(memory);
      return queryTerms.some(term => normalizedMemory.includes(term));
    })
    .slice(0, Math.max(0, Math.min(8, limit)));
}

/**
 * Builds the bounded transcript sent to the live-call model. Callers should
 * pass the current call transcript rather than the account-wide chat archive.
 * The exact recognized turn is always appended last and is therefore the
 * authoritative instruction.
 */
export function buildVoiceConversationHistory(
  messages: VoiceConversationMessage[] | undefined,
  currentUserMessage: string,
  options: VoiceConversationHistoryOptions = {},
): VoiceConversationMessage[] {
  const exactCurrentTurn = String(currentUserMessage || '').trim();
  if (!exactCurrentTurn) return [];

  const maxMessages = Math.max(2, Math.min(16, options.maxMessages || 10));
  const clean = (Array.isArray(messages) ? messages : [])
    .filter(isDialogueMessage)
    .map(message => ({ ...message, content: String(message.content || '').trim() }));

  // Remove anything after the current recognized turn and avoid appending that
  // turn twice when the UI has already placed it in the call transcript.
  const normalizedCurrent = normalizeTurn(exactCurrentTurn);
  let currentIndex = -1;
  for (let index = clean.length - 1; index >= 0; index -= 1) {
    if (isUserRole(clean[index].role) && normalizeTurn(clean[index].content) === normalizedCurrent) {
      currentIndex = index;
      break;
    }
  }
  const beforeCurrent = (currentIndex >= 0 ? clean.slice(0, currentIndex) : clean)
    .slice(-(maxMessages - 1));
  const current = currentIndex >= 0
    ? { ...clean[currentIndex], role: 'user', type: 'text', content: exactCurrentTurn }
    : { role: 'user', type: 'text', content: exactCurrentTurn };

  if (isVoiceGreetingOnly(exactCurrentTurn)) {
    return [current];
  }

  if (isContextUnsafeVoiceTurn(exactCurrentTurn)) {
    const immediateAssistant = beforeCurrent.length > 0 && isAssistantRole(beforeCurrent.at(-1)?.role)
      ? beforeCurrent.at(-1)
      : undefined;
    return immediateAssistant ? [immediateAssistant, current] : [current];
  }

  return [...beforeCurrent, current].slice(-maxMessages);
}
