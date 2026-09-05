export const AUTO_PERSONA_VOICE_ENGINE = 'persona_voice_auto';
export const ELEVENLABS_CLONED_VOICE_MODEL = 'eleven_v3_conversational';
export const ELEVENLABS_LOW_LATENCY_FALLBACK_MODEL = 'eleven_flash_v2_5';
export const MAYA_UNCLONED_VOICE_MODEL = 'fal_maya_stream';

type PersonaVoiceSource = {
  name?: unknown;
  voiceId?: unknown;
  voiceSampleUrl?: unknown;
  voiceFile?: unknown;
  voiceReference?: unknown;
  audioSamples?: Array<{ base64?: unknown }>;
};

const DIRECT_ELEVENLABS_VOICE_ID = /^[a-zA-Z0-9]{18,24}$/;
const BUILT_IN_CLONED_PERSONA = /\b(?:leen|rawan)\s+hass?an\b/i;

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
  const usesBundledClone = BUILT_IN_CLONED_PERSONA.test(String(persona.name || ''));

  return hasUploadedReference || hasSavedElevenLabsVoiceId || usesBundledClone;
}

export function resolvePersonaVoiceEngine(
  persona: PersonaVoiceSource | null | undefined,
  selectedEngine: string,
): string {
  if (selectedEngine !== AUTO_PERSONA_VOICE_ENGINE) return selectedEngine;
  return hasSavedPersonaVoiceClone(persona)
    ? ELEVENLABS_CLONED_VOICE_MODEL
    : MAYA_UNCLONED_VOICE_MODEL;
}
