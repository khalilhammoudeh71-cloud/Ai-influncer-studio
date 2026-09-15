export class SelectedSpeechError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
interface SpeechSelection {
  engine?: string; voiceId?: string; voice?: string; voiceName?: string;
  voiceReference?: string; voiceReferences?: string[]; personaName?: string;
}
interface SpeechProviders {
  elevenlabs(id: string): Promise<string>;
  openai(id: string): Promise<string>;
  clone(engine: string, reference: string): Promise<string | undefined>;
}

/** A provider selection is a binding, never a name-based fallback hint. */
export async function dispatchSelectedSpeech(body: SpeechSelection, providers: SpeechProviders) {
  const engine = body.engine?.trim() || (body.voiceId ? 'elevenlabs' : '');
  const model = voiceCloningModel(engine);
  const voiceId = body.voiceId?.trim() || body.voice?.trim();
  if (engine === 'elevenlabs' || model?.id === 'elevenlabs') {
    if (!voiceId) throw new SelectedSpeechError('Select an ElevenLabs voice before speaking.');
    return { audioUrl: await providers.elevenlabs(voiceId), engine, voiceId };
  }
  if (engine === 'openai' || engine === 'openai:tts') {
    const selected = voiceId || body.voiceName?.trim();
    if (!selected) throw new SelectedSpeechError('Select an OpenAI voice before speaking.');
    return { audioUrl: await providers.openai(selected), engine, voiceId: selected };
  }
  if (model?.kind === 'reference') {
    if ((body.voiceReferences?.length || 0) > 1) throw new SelectedSpeechError('This provider accepts one reference per request. Select one recording; all saved recordings are preserved.', 422);
    const reference = body.voiceReferences?.[0] || body.voiceReference;
    if (!reference) throw new SelectedSpeechError('This voice engine requires a voice reference. Select or upload one in Voice Studio.');
    const audioUrl = await providers.clone(engine, reference);
    if (!audioUrl) throw new SelectedSpeechError('The selected clone engine is unavailable. Your saved voice is unchanged.', 503);
    return { audioUrl, engine, isCloned: true };
  }
  if (model?.kind === 'preset' || (model?.id === 'minimax-clone' && voiceId)) {
    const audioUrl = await providers.clone(engine, '');
    if (!audioUrl) throw new SelectedSpeechError('The selected speech model returned no audio.', 502);
    return { audioUrl, engine, voiceId, isCloned: model.kind === 'enrollment' };
  }
  if (model?.kind === 'singing') throw new SelectedSpeechError('Mureka vocal IDs are for music generation, not spoken calls.', 422);
  throw new SelectedSpeechError('The selected speech provider is not configured for this endpoint. Choose a supported voice in Voice Studio.', 422);
}
import { voiceCloningModel } from '../shared/voiceCloningModels';
