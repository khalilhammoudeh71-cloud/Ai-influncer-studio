import type { VoiceCloningModel } from '../../shared/voiceCloningModels';
import type { CloneResult } from '../../shared/personaVoiceLifecycle';
import type { StockVoice } from '../../shared/stockVoices';

export type VoiceRequirement = { message: string; target?: 'recording' | 'permission' | 'transcript' | 'model' | 'identity' };
export function cloneRequirements(input: {
  model: VoiceCloningModel; sampleCount: number; authorized: boolean; transcript: string;
  saving: boolean; rendering: boolean; result: CloneResult | null; retryRejected?: boolean;
}): VoiceRequirement[] {
  const { model } = input;
  if (input.saving) return [{ message: 'Wait for the persona to finish saving.' }];
  if (input.rendering) return [{ message: 'Rendering is in progress. You can stop waiting below.' }];
  if (model.kind === 'unavailable') return [{ message: `${model.name} is unavailable. Choose a connected model.`, target: 'model' }];
  const missing: VoiceRequirement[] = [];
  if (model.kind !== 'preset' && !input.sampleCount) missing.push({ message: 'Add a recording of the voice you want to use.', target: 'recording' });
  if (model.kind !== 'preset' && !input.authorized) missing.push({ message: 'Confirm that you have the speaker’s permission.', target: 'permission' });
  if (model.transcriptRequired && !input.transcript.trim()) missing.push({ message: 'Enter the exact words in the reference recording.', target: 'transcript' });
  if (input.result && !(input.retryRejected && input.result.status === 'failed')) missing.push({ message: input.result.status === 'ready'
    ? 'This result is ready. Use it below, or choose another recording or model.'
    : 'Check the existing render’s status before starting another.' });
  return missing;
}

export function voiceActionRequirements(input: { saving: boolean; rendering: boolean; hasVoice: boolean; draftChanged: boolean; name: string }) {
  const preview: VoiceRequirement[] = input.saving ? [{ message: 'Wait for the persona to finish saving.' }]
    : input.rendering ? [{ message: 'Wait for the voice render to finish.' }]
    : !input.hasVoice ? [{ message: 'Select an available voice or finish rendering a voice first.' }] : [];
  const save = [...preview];
  if (!input.name.trim()) save.push({ message: 'Add a persona name in Identity before saving.', target: 'identity' });
  if (input.draftChanged) save.push({ message: 'Render your changed recording before saving it as the default. Your previous voice is still selected.' });
  return { preview, save };
}

/** A voice may be supplied by both the account catalog and the stock catalog. */
export function uniqueVoices<T extends StockVoice>(voices: T[]): T[] {
  const seen = new Set<string>();
  return voices.filter(voice => {
    const key = `${voice.provider.trim().toLowerCase()}:${voice.id}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
