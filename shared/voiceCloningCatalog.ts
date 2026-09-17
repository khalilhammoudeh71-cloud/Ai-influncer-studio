import { VOICE_CLONING_MODELS, type VoiceCloningModel } from './voiceCloningModels';

// Provider catalog/documentation snapshot, checked 2026-09-17. Catalog presence
// is not account entitlement and must never make an unimplemented adapter runnable.
export type VoiceCatalogEntry = VoiceCloningModel & { documentation?: string; availability?: string };
const pending = (provider: string, model: string, name: string, description: string, documentation: string, availability = 'Not connected in this app'): VoiceCatalogEntry => ({
  id: `catalog:${provider}:${model}`, provider, model, name, description, documentation, availability, kind: 'unavailable',
});
const fal = (model: string, name: string, description = 'Cloning from a reference recording.') => pending('Fal', model, name, description, `https://fal.ai/models/${model}`);
const wiro = (model: string, name: string, description: string) => pending('Wiro', model, name, description, `https://wiro.ai/models/${model}`);

export const VOICE_CLONING_CATALOG: VoiceCatalogEntry[] = [
  ...VOICE_CLONING_MODELS,
  pending('ElevenLabs', 'professional', 'ElevenLabs Professional Voice Clone', 'A trained clone with speaker verification and plan requirements. Existing completed account voices can be selected in My ElevenLabs Voices.', 'https://elevenlabs.io/docs/overview/capabilities/voices', 'Create at provider · import account voice'),
  pending('WaveSpeed', 'bytedance/seed-audio-1.0', 'ByteDance Seed Audio 1.0', 'Speech conditioned on reference audio. Separate from the preset-only Seed Speech 2.0 model.', 'https://wavespeed.ai/models/bytedance/seed-audio-1.0'),
  fal('fal-ai/minimax/voice-clone', 'MiniMax Voice Clone', 'Creates a reusable MiniMax clone. Speech engines include 02 HD/Turbo, 2.5 preview HD/Turbo, 2.6 HD/Turbo and 2.8 HD/Turbo; they share the cloning flow.'),
  fal('fal-ai/qwen-3-tts/clone-voice/1.7b', 'Qwen3-TTS Clone Voice 1.7B', 'Creates a voice reference for Qwen3-TTS 1.7B. Arabic is not a listed output language.'),
  fal('fal-ai/qwen-3-tts/clone-voice/0.6b', 'Qwen3-TTS Clone Voice 0.6B', 'Smaller Qwen3-TTS cloning variant. Arabic is not a listed output language.'),
  fal('fal-ai/zonos', 'Zonos'),
  fal('fal-ai/zonos2', 'Zonos2'),
  fal('fal-ai/chatterbox/text-to-speech', 'Chatterbox'),
  fal('fal-ai/chatterbox/text-to-speech/multilingual', 'Chatterbox Multilingual'),
  fal('fal-ai/chatterbox/text-to-speech/turbo', 'Chatterbox Turbo', 'Fast reference-based speech. This variant is English-focused.'),
  fal('resemble-ai/chatterboxhd/text-to-speech', 'Chatterbox HD'),
  fal('fal-ai/index-tts-2/text-to-speech', 'IndexTTS 2'),
  fal('fal-ai/dia-tts/voice-clone', 'Dia TTS Voice Clone', 'Reference-based dialogue voice cloning.'),
  fal('fal-ai/tada/3b/text-to-speech', 'Hume TADA 3B', 'Speech generation conditioned on a reference recording.'),
  fal('fal-ai/tada/1b/text-to-speech', 'Hume TADA 1B', 'Smaller TADA variant with reference speech conditioning.'),
  fal('fal-ai/vibevoice', 'VibeVoice 1.5B', 'Multi-speaker speech with an audio reference for each speaker.'),
  fal('fal-ai/vibevoice/7b', 'VibeVoice 7B', 'Larger multi-speaker speech model with voice references.'),
  fal('fal-ai/kling-video/create-voice', 'Kling Create Voice', 'Creates voices for Kling video voice control, not standalone persona calls.'),
  wiro('humeai/tada-3b-ml', 'Hume TADA 3B Multilingual', 'Reference-based speech synthesis.'),
  wiro('nineninesix/kani-tts-2-en', 'Kani TTS 2 English', 'English speech with reference voice cloning.'),
  wiro('resemble-ai/chatterbox-turbo', 'Chatterbox Turbo', 'Fast reference-based speech. English-focused.'),
  wiro('openmoss/moss-ttsd', 'OpenMOSS MOSS-TTSD', 'Multi-speaker dialogue with separate audio and transcript references.'),
  wiro('openmoss/moss-tts-realtime', 'OpenMOSS MOSS-TTS Realtime', 'Streaming speech with zero-shot voice cloning; Arabic is listed by Wiro.'),
  wiro('openbmb/voxcpm', 'OpenBMB VoxCPM', 'Original VoxCPM reference cloning model, separate from VoxCPM2.'),
  wiro('wiro/voice-clone', 'Coqui Voice Clone', 'Text-to-speech cloning from a short speaker recording.'),
  wiro('wiro/rvc-voice-clone-youtube', 'RVC Voice Clone / Song Cover', 'Voice conversion for song covers using a trained RVC voice model. Not a spoken-call voice.'),
  pending('Cartesia', 'instant', 'Cartesia Instant Voice Clone', 'Creates a reusable Cartesia voice from a short recording. Account access and supported synthesis engine must be checked.', 'https://docs.cartesia.ai/build-with-cartesia/capability-guides/clone-voices'),
  pending('Cartesia', 'professional', 'Cartesia Professional Voice Clone', 'Professional voice training with provider plan and enrollment requirements.', 'https://www.cartesia.ai/pricing', 'Provider enrollment required'),
  pending('xAI', 'custom-voices', 'xAI Custom Voice Clone', 'Clones a reference clip for xAI speech APIs. Provider-specific voice IDs are required.', 'https://docs.x.ai/developers/model-capabilities/audio/custom-voices'),
  pending('OpenAI', 'custom-voices', 'OpenAI Custom Voices', 'Requires custom-voice account access, a consent recording and a voice sample. Stock Nova/Onyx voices are not clones.', 'https://developers.openai.com/api/docs/guides/text-to-speech', 'Restricted access · not connected'),
  pending('HeyGen', 'instant', 'HeyGen Instant Voice Clone (Starfish)', 'Clones a single recording for Starfish speech and HeyGen videos; requires a completed clone before use.', 'https://developers.heygen.com/docs/voices/instant-voice-clone'),
  pending('HeyGen', 'professional', 'HeyGen Professional Voice Clone', 'Requires provider enablement, a purchased voice slot and at least 20 minutes of recordings.', 'https://developers.heygen.com/docs/voices/professional-voice-clone', 'Provider enrollment required'),
  pending('Venice', 'tts-chatterbox-hd', 'Chatterbox HD Voice Clone', 'Reference-based voice handles expire after seven days; the recording must be retained for renewal.', 'https://docs.venice.ai/guides/media/voice-cloning'),
  pending('Atlas Cloud', 'bytedance/seed-audio-1.0', 'ByteDance Seed Audio 1.0', 'Speech using up to three audio references, each no longer than 30 seconds.', 'https://www.atlascloud.ai/docs/models/audio'),
  pending('Runware', 'alibaba:qwen@3-tts-1.7b-base', 'Qwen3-TTS 1.7B Base', 'Reference cloning with recording transcript. Arabic is not a listed output language.', 'https://runware.ai/docs/models/alibaba-qwen3-tts-1-7b-base/examples'),
  pending('Runware', 'fishaudio:s2.1@pro', 'Fish Audio S2.1 Pro', 'Single-speaker reference cloning; requires the reference audio transcript.', 'https://runware.ai/docs/models/fish-audio-s2-1-pro'),
];

export const VOICE_CATALOG_NOTES = [
  'Checked September 17, 2026. Listed does not mean your account has access. Arabic and dialect quality still need a listening test.',
  'MiniMax speech engines reuse the same clone: WaveSpeed lists 02 HD/Turbo, 2.5 preview HD/Turbo, 2.6 HD/Turbo and 2.8 HD/Turbo. The app currently plays its MiniMax clone through 2.6 HD.',
  'Gemini offers preset speech and live conversation voices; no recording-based cloning endpoint was verified for the configured Gemini API.',
  'Speech-to-speech conversion, preset voices and voice design are not additional cloning models. Singing and video-only entries are identified in their descriptions.',
];
