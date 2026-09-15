import { mergeVoiceDraft } from '../shared/personaVoiceLifecycle';
import { VoiceLifecycleError } from './personaVoiceLifecycle';

export async function prepareVoiceSave(saved: Record<string, any>, draft: Record<string, any>, verify: (voice: Record<string, any>) => Promise<void>) {
  const merged = mergeVoiceDraft(saved, draft);
  const changed = JSON.stringify(merged) !== JSON.stringify(mergeVoiceDraft(saved, {}));
  if (changed && saved.voiceRevision && draft.voiceRevision !== saved.voiceRevision) throw new VoiceLifecycleError('The persona changed since you opened it. Reload before replacing its voice.');
  const replaced = (merged.voiceId || '') !== (saved.voiceId || '') || (merged.voiceEngine || '') !== (saved.voiceEngine || '');
  if (replaced && merged.voiceId) await verify(merged);
  return merged;
}
