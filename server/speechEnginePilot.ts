import { drainSseData } from '../src/utils/voiceStability';
export type PilotMessage = { role: 'user' | 'model'; content: string };
export class PilotSetupError extends Error {}
export function shouldEndPilotCall(text: string) {
  const words=text.trim().toLowerCase().replace(/[.!?]+$/,'').trim();
  return /^(please )?((end|stop) (the |this )?call|hang up)( please)?$/.test(words);
}
export class PilotSessions<T extends { userId: string } = { userId: string }> {
  private pending = new Map<string, { context: T; expires: number }>();
  register(room: string, context: T, now = Date.now()) {
    for (const [key, value] of this.pending) if (value.expires < now) this.pending.delete(key);
    if (this.pending.has(room)) throw new Error('Conversation already registered');
    this.pending.set(room, { context, expires: now + 60000 });
  }
  claim(room: string, now = Date.now()): T | undefined {
    const value = this.pending.get(room);
    this.pending.delete(room);
    return value && value.expires >= now ? value.context : undefined;
  }
}
/** This token comes directly from ElevenLabs over HTTPS, never from browser input. */
export function conversationRoom(token: string): string {
  try {
    const room = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).video?.room;
    if (typeof room === 'string' && /^conv_[a-zA-Z0-9_-]+$/.test(room)) return room;
    // Live provider rooms include the engine prefix; only their final conversation segment is used.
    if (typeof room === 'string') {
      const match = /^room_agent_[a-zA-Z0-9]+_(conv_[a-zA-Z0-9]+)$/.exec(room);
      if (match) return match[1];
    }
  } catch {}
  throw new PilotSetupError('Speech Engine returned an unsupported conversation token; call was not started.');
}
export function pilotMessages(transcript: unknown[], history: PilotMessage[]): PilotMessage[] {
  if (!Array.isArray(transcript) || transcript.length > 500) throw new Error('Invalid transcript');
  const messages = transcript.map((value: any): PilotMessage => {
    if (!value || !['user', 'agent'].includes(value.role)) throw new Error('Invalid transcript role');
    if (typeof value.content !== 'string' || value.content.length > 20000) throw new Error('Invalid transcript content');
    return { role: value.role === 'agent' ? 'model' : 'user', content: value.content };
  });
  return [...history, ...messages].slice(-30);
}
export function selectPilotPersona(personas: any[], id: string) {
  const persona = personas.find(p => p.id === id);
  if (!persona) throw new PilotSetupError('Select one of your saved personas for this pilot.');
  if (!persona.voiceId || (persona.voiceEngine && persona.voiceEngine !== 'elevenlabs')) throw new PilotSetupError('The pilot requires a saved ElevenLabs voice.');
  return persona;
}
export function applyPilotVoice(persona: any, overrides: Record<string, string>) {
  const voiceId = Object.prototype.hasOwnProperty.call(overrides, persona.name) && overrides[persona.name];
  return voiceId ? { ...persona, voiceId, voiceEngine: 'elevenlabs' } : persona;
}
export function pilotSetupError(error: any): string {
  if (error instanceof PilotSetupError) return error.message;
  if (error?.body?.detail?.code === 'voice_not_found' || error?.body?.detail?.status === 'voice_not_found') return 'This saved voice is unavailable in ElevenLabs. Select an available voice before trying again.';
  return 'Speech Engine could not start this call. Please retry or check the pilot setup.';
}
export async function* streamPilotReply(response: Response, signal: AbortSignal): AsyncGenerator<string> {
  if (!response.ok || !response.body) throw new Error(`Agent response unavailable (${response.status})`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (signal.aborted) break;
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const frames = drainSseData(pending, done);
      pending = frames.remainder;
      for (const frame of frames.data) {
        if (signal.aborted || frame === '[DONE]') return;
        const data = JSON.parse(frame);
        if (data.error) throw new Error('The agent could not complete this reply.');
        if (data.done) return;
        if (typeof data.text === 'string') yield data.text;
      }
      if (done) return;
    }
  } finally { signal.removeEventListener('abort', abort); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
