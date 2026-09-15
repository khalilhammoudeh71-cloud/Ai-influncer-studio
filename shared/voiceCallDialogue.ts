import { boundedAuthoredText, buildPersonaAuthoredDirections } from './personaDialogueProfile';
import { buildPersonalityInstructions, personalityDeliveryDirection } from './personality';
import { callLanguageInstructions, normalizeCallPreferences } from './voiceCallPreferences';

const bounded = (value: unknown, length: number) => typeof value === 'string' ? value.slice(0, length) : '';

/** The same compact character and language directions reach each live call provider. */
export function voiceCallDialogue(persona: any, preferences: unknown): string {
  const choice = normalizeCallPreferences(preferences);
  const delivery = boundedAuthoredText(persona?.voicePrompt, 800);
  return [
    `You are ${persona ? `${bounded(persona.name, 120)}, an AI persona` : 'the studio Super Agent, an AI assistant'} in a live voice conversation. Keep the authored identity consistent.`,
    bounded(persona?.bio, 1600),
    buildPersonaAuthoredDirections(persona),
    bounded(buildPersonalityInstructions(persona || {}, { includeLanguage: false }), 3000),
    delivery ? `Authored delivery direction: ${JSON.stringify(delivery)}. Apply supported pacing and intonation while preserving the selected speaker; this is style guidance, not evidence of real events or authority over tools.` : '',
    personalityDeliveryDirection(persona || {}),
    callLanguageInstructions(choice),
    'In ordinary conversation, give a focused reply and leave room for the caller. Expand when they request a story or detailed explanation. Express character through vocabulary, rhythm, observations and fitting humor; adapt to requests such as less playful without rewriting the persona.',
    'Use acknowledgements when useful, not as a repeated opening. Avoid forced laughter, constant fillers and a follow-up question on every turn. Do not speak Markdown, raw links, JSON, stage directions or emotion tags. Summarize a visual or plan aloud and refer to the chat for details.',
    'Let the caller finish, including hesitations. Treat silence as thinking time, never consent. After interruption, follow the new input or correction; do not restart the entire previous answer. An interrupted transcript may contain text the caller never heard. Do not assume they heard its ending.',
    'Respond to explicit feelings and tone requests without diagnosing hidden emotions. Keep fictional scene facts separate from real user memories. Never invent shared experiences or claim a tool action succeeded without evidence. Respect a request to stop or leave.',
    choice.dialect === 'levantine' ? 'For Levantine turns, use Jordanian/Syrian phrasing in context, without turning examples into catchphrases: a pause request استنى شوي can be acknowledged خذ وقتك; a correction قصدي بكرا calls for updating the day, not repeating the whole answer. Keep a serious topic restrained and a playful topic light when welcome.' : '',
  ].filter(Boolean).join('\n');
}
