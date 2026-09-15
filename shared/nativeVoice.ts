export const OPENAI_NATIVE_VOICES = ['marin', 'cedar', 'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'] as const;
export type NativeProvider = 'elevenlabs' | 'openai' | 'hume';
export type NativeMessage = { id: string; role: 'user' | 'model'; content: string };
export const NATIVE_SCENARIOS = [
  'Ordinary: Tell me one interesting idea, then ask me a question.',
  'Neutral: Tell me we can take this one step at a time.',
  'Comforting: I had a difficult day. Reassure me gently.',
  'Excited: Our project just reached its first thousand fans!',
  'Playful: Challenge me to a silly two-minute creativity game.',
  'Pause: Start a sentence, hesitate for two seconds, then finish it.',
  'Interrupt: Interrupt a long answer and ask a different question.',
  'Tool: Ask the studio assistant to plan three posts, then discuss the plan.',
  'Lifecycle: Mute, unmute, end, reconnect, and switch personas.',
  'Levantine: احكي معي أردني أو سوري. شو ممكن أعمل بعطلة الأسبوع؟',
  'Switch: خلينا نحكي إنجليزي شوي. Then ask to switch back to Arabic.',
  'Correction: قصدي بكرا، مش اليوم. Check that the answer uses the corrected day.',
  'Names and numbers: Give a name, a time and a number; correct one digit and check it again.',
  'Typed turn: Type while the reply plays; send when listening, then continue aloud.',
];
export function nativeHistory(value: unknown) {
  if (!Array.isArray(value)) return [];
  const turns = new Map<string | symbol, { role: 'user' | 'assistant'; content: string }>();
  for (const message of value) {
    if (!message || !['user','model','assistant','persona'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim()) continue;
    const role = message.role === 'user' ? 'user' : 'assistant';
    const key = typeof message.id === 'string' && message.id ? `${role}:${message.id}` : Symbol();
    // Keep the delivery marker even when a long generated answer must be bounded.
    const marker = role === 'assistant' ? message.content.match(/\n\[Voice reply interrupted[^\]]*\]$/)?.[0] || '' : '';
    const text = marker ? message.content.slice(0, -marker.length) : message.content;
    turns.set(key, { role, content: text.slice(0, 3000 - marker.length) + marker });
  }
  return [...turns.values()].slice(-20);
}
export function nativeVoiceChoice(value: unknown): string {
  if (typeof value !== 'string' || !(OPENAI_NATIVE_VOICES as readonly string[]).includes(value)) throw new Error('Choose a supported OpenAI voice. Saved clone IDs cannot be used here.');
  return value;
}
