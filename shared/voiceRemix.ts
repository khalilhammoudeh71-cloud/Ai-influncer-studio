export type VoiceRemixStatus = 'submitting' | 'unknown' | 'failed' | 'ready';
export type VoiceRemixInput = { voiceId: string; description: string; text?: string; operationId: string; mode?: 'design'; designModel?: 'eleven_multilingual_ttv_v2' | 'eleven_ttv_v3'; guidanceScale?: number; loudness?: number; seed?: number; enhance?: boolean };
export type VoiceRemixPreview = { generatedVoiceId: string; audioUrl: string };
export type VoiceRemixResult = { operationId: string; status: VoiceRemixStatus; previews: VoiceRemixPreview[]; text?: string; message?: string };
export type SaveRemixedVoiceInput = { operationId: string; generatedVoiceId: string; name: string; description: string; retryRejected?: boolean };
export type SavedRemixedVoiceResult = { status: VoiceRemixStatus; voiceId?: string; name?: string; message?: string };
