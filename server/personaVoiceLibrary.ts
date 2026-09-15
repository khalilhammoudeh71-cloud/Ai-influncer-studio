import { createHash } from 'node:crypto';
import { permanentVoiceReference, personaVoiceIdentity, type SavedPersonaVoice } from '../shared/personaVoiceLibrary';
import { mergeVoiceDraft } from '../shared/personaVoiceLifecycle';

export function rememberPersonaVoices(library: SavedPersonaVoice[], previous: Record<string, any>, current: Record<string, any>, personaName: string, now = new Date().toISOString()): SavedPersonaVoice[] {
  const entries = new Map(library.map(voice => [voice.id, structuredClone(voice)]));
  for (const voice of [previous, current]) {
    if (!voice.voiceId && !voice.voiceSampleUrl && !voice.audioSamples?.length) continue;
    const id = createHash('sha256').update(personaVoiceIdentity(voice)).digest('hex');
    const existing = entries.get(id);
    const fields = mergeVoiceDraft({}, voice);
    delete fields.voiceName;
    const snapshot: SavedPersonaVoice = {
      ...fields,
      id,
      name: (typeof voice.voiceName === 'string' && voice.voiceName.trim().slice(0,120)) || existing?.name || `${personaName} — Voice ${entries.size + 1}`,
      savedAt: existing?.savedAt || now,
      updatedAt: now,
      voiceSampleUrl: permanentVoiceReference(voice.voiceSampleUrl || existing?.voiceSampleUrl || ''),
      audioSamples: (voice.audioSamples?.length ? voice.audioSamples : existing?.audioSamples || []).map((sample: any) => ({
        name: typeof sample === 'string' ? 'Voice recording' : sample.name || 'Voice recording',
        base64: permanentVoiceReference(typeof sample === 'string' ? sample : sample.base64 || ''),
        ...(typeof sample.thumbnail === 'string' && sample.thumbnail.startsWith('data:image/jpeg;base64,') && sample.thumbnail.length < 200000 ? { thumbnail: sample.thumbnail } : {}),
      })),
      provider: voice.voiceBinding?.provider || existing?.provider,
      account: voice.voiceBinding?.account || existing?.account,
    };
    entries.set(id, snapshot);
  }
  return [...entries.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function removeRememberedVoice(library: SavedPersonaVoice[], current: Record<string, any>, personaName: string, entryId: string) {
  const entries = rememberPersonaVoices(library, {}, current, personaName);
  if (!entries.some(voice => voice.id === entryId)) return null;
  return {
    library: entries.filter(voice => voice.id !== entryId),
    removingCurrent: rememberPersonaVoices([], {}, current, personaName)[0]?.id === entryId,
  };
}
