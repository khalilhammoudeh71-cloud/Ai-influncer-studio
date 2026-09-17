import { isConversationalMediaCreationRemark } from './personaMediaIntent';
export interface MediaDraftMessage { role?: string; type?: string; content?: string }
export interface VoiceMediaDraft { status: 'none' | 'waiting' | 'ready'; type?: 'image' | 'video'; prompt?: string }
export function resolveVoiceMediaDraft(current: string, history: MediaDraftMessage[]): VoiceMediaDraft {
  const text = current.trim();
  const finish = /\b(?:send|show)\s+(?:me\s+)?(?:that|it|the (?:image|photo|picture|video))\b|\b(?:now\s+(?:generate|create|make|render)|(?:generate|create|make|render)\s+(?:it|that|the (?:image|photo|picture|video))\s+now|go ahead and (?:make|generate|create|send)(?: it| that)?|let'?s see it)\b/i;
  const media = /\b(image|photo|picture|portrait|selfie|video|clip)\b|(صورة|صوره|صور|سيلفي|فيديو|مقطع)/i;
  const arabicFinish = /(?:ابعتي|ابعت|أرسلي|ارسل|ارسلي|ورجيني|فرجيني|ولدي|ولّد|انشئي)\s*(?:لي\s*)?(?:الصورة|الصوره|الفيديو|المقطع|إياها|اياها|ها)|(?:اعملي|اعمل|سوي)\s+(?:الصورة|الصوره|الفيديو|المقطع)/u;
  const finished = (value: string) => finish.test(value) || arabicFinish.test(value);
  const videoKind = (value: string) => /video|clip|فيديو|مقطع/i.test(value);
  const description = /\b(?:wearing|standing|sitting|hugging|walking|holding|jacket|dress|beach|cafe|window|sunset|lighting|background|close-up|waist-up)\b|(?:لابسة|لابسه|واقف|قاعد|جالس|ماشي|شاطئ|الشاطي|بحر|مقهى|حديقة|جاكيت|فستان|خلفية|إضاءة|اضاءة)/i;
  const cancel = (value: string) => /(?:ما بدي|مش بدي|لا أريد|لا اريد|بلاش|الغ[يِ]|إلغاء|انسى|بطلي)/u.test(value) || isConversationalMediaCreationRemark(value) || /\b(?:cancel|forget|never mind|not yet|don'?t generate|do not generate)\b/i.test(value);
  if (!text || cancel(text)) return { status: 'none' };
  const prior = history.slice(-20);
  if (prior.at(-1)?.role === 'user' && prior.at(-1)?.content?.trim() === text) prior.pop();
  if (prior.some(m=>m.type==='image'||m.type==='video'||/^(?:Done —|خلص،|\[Persona generated and sent)/.test(m.content||''))&&/(?:^|[،,.!?؟]\s*)(?:غيري|غيّري|عدلي|عدّلي|بدلي|بدّلي)\s/u.test(text)) return {status:'none'};
  const previous = prior.at(-1);
  const confirmsQuestion = /^(?:yes|yeah|yep|sure|go ahead|please do|اه|آه|ايوه|أيوه|نعم|تمام|يلا|اعمليها)[.!؟ ]*$/i.test(text)
    && previous?.role !== 'user'
    && /\bshall I (?:make|generate|send) it\?|Tell me to make the (?:image|video)|(?:أعملها|اعملها|أبعثها|ابعثها|قولي اعملي)/i.test(previous?.content || '');
  const startsRequest = (value: string) => media.test(value) && (
    /\b(?:generate|create|make|render|send|show|give|want|need|would like)\s+(?:me\s+)?(?:(?:a|an|the|another|new|some)\s+)*(?:image|photo|picture|portrait|selfie|video|clip)\b/i.test(value)
    || /^(?:a|an)\s+(?:image|photo|picture|portrait|selfie|video|clip)\b/i.test(value)
    || /(?:بدي|بدّي|عايز|عايزة|أريد|اريد|اعملي|اعمل|ولدي|ابعتي|ابعت|ورجيني|فرجيني)\s+(?:(?:لي|إلي|الي|كمان|واحدة|وحدة)\s+)?(?:ال)?(?:صورة|صوره|صور|سيلفي|فيديو|مقطع)/u.test(value)
  );
  // Only fragments of an active request refine a scene. Ordinary sentences
  // containing location or clothing words are conversation, not media intent.
  const fragment = (value: string) => /^(?:and|with|while|also|both|in|at|wearing|actually|instead)\b/i.test(value)
    || /^(?:و?ب(?:جاكيت|فستان|إضاءة|اضاءة)|و?مع\s|و?خلي(?:ها|ك|كي|ه)?\s|لابسة\s|لابسه\s|على الشاطئ|بالشاطئ|في المقهى|خلفية\s|إضاءة\s|اضاءة\s)/u.test(value);
  let parts: string[] = [];
  let type: 'image' | 'video' = 'image';
  for (const message of [...prior, { role: 'user', content: text }]) {
    const content = message.content?.trim() || '';
    if (message.type === 'image' || message.type === 'video' || /^(?:Done —|خلص،|\[Persona generated and sent)/.test(content)) {
      parts = [];
      continue;
    }
    if (message.role !== 'user') continue;
    if (cancel(content)) { parts = []; continue; }
    if (startsRequest(content)) {
      // A send-only follow-up keeps the scene the caller already described.
      if (!finished(content) || description.test(content)) {
        parts = [content];
        type = videoKind(content) ? 'video' : 'image';
      }
    } else if (parts.length && fragment(content)) {
      parts.push(content);
    } else if (!finished(content) && !(content === text && confirmsQuestion)) {
      // Any unrelated user turn ends the pending scene. History cannot reopen it.
      parts = [];
    }
  }
  const ready = finished(text) || confirmsQuestion;
  const hasScene = parts.some(part => description.test(part) || /\b(?:of|featuring|showing)\s+\S+\s+\S+/i.test(part));
  if (ready) {
    if (!parts.length && !startsRequest(text)) return { status: 'none' };
    return hasScene ? { status: 'ready', type, prompt: parts.join('\n') } : { status: 'waiting', type };
  }
  if (startsRequest(text) || (parts.length && fragment(text))) {
    return { status: 'waiting', type, prompt: hasScene ? parts.join('\n') : undefined };
  }
  return { status: 'none' };
}
