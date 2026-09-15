type Voice = {
  id?: string; name?: string; voiceId?: string; voiceSampleUrl?: string; voiceEngine?: string;
  voiceStability?: number; voiceLikeness?: number; voiceStyleExaggeration?: number; voiceSpeakingSpeed?: number;
};

/** Freeze one persona's binding for a turn. Never mix in another persona's clone. */
export function buildAgentSpeechRequest(text: string, persona: Voice | undefined, defaults: Voice) {
  const source = persona || defaults;
  const engine = source.voiceEngine || (source.voiceId ? 'elevenlabs' : 'omnivoice');
  const directElevenVoice = engine === 'elevenlabs' && Boolean(source.voiceId);
  return {
    text,
    activePersona: persona,
    personaName: source.name || 'Super Agent',
    voiceName: source.name || 'Aoede',
    voiceId: source.voiceId,
    // An existing ElevenLabs voice must not be zero-shot cloned from its old sample.
    voiceReference: directElevenVoice ? undefined : source.voiceSampleUrl,
    engine,
    voiceSettings: {
      stability: source.voiceStability === undefined ? undefined : source.voiceStability / 100,
      similarity_boost: source.voiceLikeness === undefined ? undefined : source.voiceLikeness / 100,
      style: source.voiceStyleExaggeration === undefined ? undefined : source.voiceStyleExaggeration / 100,
      speed: source.voiceSpeakingSpeed,
    },
  };
}

export function validateAgentSpeechResponse(
  request: ReturnType<typeof buildAgentSpeechRequest>,
  data: { audioUrl?: unknown; voiceId?: unknown; engine?: unknown },
): string {
  if (typeof data.audioUrl !== 'string' || !data.audioUrl.trim()) throw new Error('No speech audio was returned');
  if ((data.engine && data.engine !== request.engine)
    || (request.voiceId && data.voiceId && request.voiceId !== data.voiceId)
    || (request.engine === 'elevenlabs' && request.voiceId && data.voiceId !== request.voiceId)) {
    throw new Error('The selected voice is unavailable; a different voice will not be substituted');
  }
  return data.audioUrl;
}
