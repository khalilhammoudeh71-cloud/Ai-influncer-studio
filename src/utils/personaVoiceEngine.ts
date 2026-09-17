import { normalizeLanguage, type LanguageProfile } from '../../shared/personaLanguage';
export const AUTO_PERSONA_VOICE_ENGINE = 'persona_voice_auto';
export const ELEVENLABS_CLONED_VOICE_MODEL = 'eleven_turbo_v2_5';
export const ELEVENLABS_LOW_LATENCY_FALLBACK_MODEL = 'eleven_flash_v2_5';
export const MAYA_UNCLONED_VOICE_MODEL = 'fal_maya_stream';

type PersonaVoiceSource = LanguageProfile & {
  name?: unknown;
  voiceEngine?: unknown;
  elevenLabsSpeechModel?: unknown;
  voiceId?: unknown;
  voiceSampleUrl?: unknown;
  voiceFile?: unknown;
  voiceReference?: unknown;
  audioSamples?: Array<{ base64?: unknown }>;
};

const DIRECT_ELEVENLABS_VOICE_ID = /^[a-zA-Z0-9]{18,24}$/;

export function hasSavedPersonaVoiceClone(persona?: PersonaVoiceSource | null): boolean {
  if (!persona) return false;

  const hasUploadedReference = Boolean(
    persona.voiceSampleUrl ||
    persona.audioSamples?.some(sample => Boolean(sample?.base64)) ||
    persona.voiceFile ||
    persona.voiceReference,
  );
  const voiceId = String(persona.voiceId || '').trim();
  const hasSavedElevenLabsVoiceId = DIRECT_ELEVENLABS_VOICE_ID.test(voiceId);

  return hasUploadedReference || hasSavedElevenLabsVoiceId;
}

export function resolvePersonaVoiceEngine(
  persona: PersonaVoiceSource | null | undefined,
  selectedEngine: string,
): string {
  if (selectedEngine !== AUTO_PERSONA_VOICE_ENGINE) return selectedEngine;
  const provider = String(persona?.voiceEngine || '').trim();
  const savedModel = String(persona?.elevenLabsSpeechModel || '');
  const automaticElevenModel = ['eleven_flash_v2_5', 'eleven_turbo_v2_5', 'eleven_multilingual_v2', 'eleven_v3'].includes(savedModel) ? savedModel : normalizeLanguage(persona || {}).language === 'ar' ? 'eleven_v3' : ELEVENLABS_CLONED_VOICE_MODEL;
  if (provider) return provider === 'elevenlabs' ? automaticElevenModel : provider;
  // Legacy ID-only records retain ElevenLabs, but names and recordings are not provider identities.
  if (DIRECT_ELEVENLABS_VOICE_ID.test(String(persona?.voiceId || ''))) return automaticElevenModel;
  return 'voice_selection_required';
}

export function getSavedPersonaVoice(persona?: PersonaVoiceSource | null) {
  return {
    voiceId: typeof persona?.voiceId === 'string' ? persona.voiceId : undefined,
    voiceReference: persona?.voiceSampleUrl || persona?.audioSamples?.[0]?.base64 || persona?.voiceFile || persona?.voiceReference,
  };
}
