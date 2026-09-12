import { isConversationalMediaCreationRemark } from './personaMediaIntent';
export interface MediaDraftMessage { role?: string; type?: string; content?: string }
export interface VoiceMediaDraft { status: 'none' | 'waiting' | 'ready'; type?: 'image' | 'video'; prompt?: string }
export function resolveVoiceMediaDraft(current: string, history: MediaDraftMessage[]): VoiceMediaDraft {
  const text = current.trim();
  const finish = /\b(?:send|show)\s+(?:me\s+)?(?:that|it|the (?:image|photo|picture|video))\b|\b(?:now\s+(?:generate|create|make|render)|(?:generate|create|make|render)\s+(?:it|that|the (?:image|photo|picture|video))\s+now|go ahead and (?:make|generate|create|send)(?: it| that)?|let'?s see it)\b/i;
  const media = /\b(image|photo|picture|portrait|selfie|video|clip)\b/i;
  const description = /\b(?:wearing|standing|sitting|hugging|walking|holding|jacket|dress|beach|cafe|window|sunset|lighting|background|close-up|waist-up)\b/i;
  const cancel = (value: string) => isConversationalMediaCreationRemark(value) || /\b(?:cancel|forget|never mind|not yet|don'?t generate|do not generate)\b/i.test(value);
  if (!text || cancel(text)) return { status: 'none' };
  const prior = history.slice(-20);
  if (prior.at(-1)?.role === 'user' && prior.at(-1)?.content?.trim() === text) prior.pop();
  const previous = prior.at(-1);
  const confirmsQuestion = /^(?:yes|yeah|yep|sure|go ahead|please do)[.! ]*$/i.test(text)
    && previous?.role !== 'user'
    && /\bshall I (?:make|generate|send) it\?/i.test(previous?.content || '');
  let parts: string[] = [];
  let type: 'image' | 'video' = 'image';
  for (const message of [...prior, { role: 'user', content: text }]) {
    const content = message.content?.trim() || '';
    if (message.type === 'image' || message.type === 'video' || /^(?:Done —|\[Persona generated and sent)/.test(content)) {
      parts = [];
      continue;
    }
    if (message.role !== 'user') continue;
    if (cancel(content)) { parts = []; continue; }
    const asset = content.match(media);
    if (asset) type = /video|clip/i.test(asset[1]) ? 'video' : 'image';
    if (asset && !finish.test(content)) {
      // A fresh explicit request begins a new scene; fragments refine it.
      if (/\b(?:generate|create|want|need|make)\b/i.test(content)) parts = [];
      type = /video|clip/i.test(asset[1]) ? 'video' : 'image';
      parts.push(content);
    } else if (description.test(content) || (parts.length && /^(?:and|with|while|also|both|in|at|wearing|actually|instead)\b/i.test(content))) {
      parts.push(content);
    } else if (!finish.test(content) && /\?|\b(?:your day|how are|talk about|new topic)\b/i.test(content)) {
      parts = [];
    }
  }
  const ready = finish.test(text) || confirmsQuestion;
  const hasScene = parts.some(part => description.test(part) || /\b(?:of|featuring|showing)\s+\S+\s+\S+/i.test(part));
  if (ready) return hasScene ? { status: 'ready', type, prompt: parts.join('\n') } : { status: 'waiting', type };
  if (media.test(text) || (parts.length && (description.test(text) || /^(?:and|with|while|also|both|in|at|wearing|actually|instead)\b/i.test(text)))) {
    return { status: 'waiting', type, prompt: hasScene ? parts.join('\n') : undefined };
  }
  return { status: 'none' };
}
