import { Conversation, type PartialOptions } from '@elevenlabs/client';
import type { NativeCallCallbacks } from './nativeVoiceCall';
import { CallTranscript } from './callTranscript';

type Session = { endSession(): Promise<void>; setMicMuted(value: boolean): void; setVolume(value: { volume: number }): void; sendUserMessage?(text: string): void; getOutputVolume?(): number };
type Connect = (options: PartialOptions) => Promise<Session>;
export class ElevenLabsCall {
  private closed = false;
  private controller = new AbortController();
  private session: Session | undefined;
  private released = new WeakSet<Session>();
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private transcript: CallTranscript;
  private replyMuted = false;
  private mode = 'listening';
  private connected = false;
  private waiting = false;
  private counter = 0;
  private pendingTyped?: { key: string; text: string };
  private transcriptAt?: number;
  private measured = false;
  private modeMeasured = false;
  private inputKind: 'text' | 'transcript' = 'transcript';
  private userAliases = new Map<string, string>();
  private seenUsers = new Set<string>();
  private meter?: ReturnType<typeof setInterval>;
  constructor(private callbacks: NativeCallCallbacks, private connect: Connect = options => Conversation.startSession(options)) {
    this.transcript = new CallTranscript(m => callbacks.message(m), m => callbacks.preview?.(m));
  }
  private metric(event: string, source: 'provider-event' | 'browser-render' | 'client-control', ms?: number) {
    this.callbacks.metric({ event, source, at: performance.now(), ms });
  }

  async start(authenticate: (signal: AbortSignal) => Promise<any>) {
    try {
      // Check permission before creating a paid provider session. The SDK owns the actual call microphone.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      stream.getTracks().forEach(track => track.stop());
      if (this.closed) return;
      this.timeout = setTimeout(() => this.fail('Call setup timed out. Try connecting again.'), 65000);
      const data = await authenticate(this.controller.signal);
      if (this.closed) return;
      const session = await this.connect({
        conversationToken: data.token, connectionType: 'webrtc', textOnly: false,
        dynamicVariables: data.dynamicVariables, userId: data.userId,
        onConversationCreated: value => { if (this.closed) this.release(value); else this.session = value; },
        onConnect: () => { if (!this.closed) { this.connected = true; clearTimeout(this.timeout); this.callbacks.state('listening'); this.metric('connected', 'client-control'); } },
        onModeChange: ({ mode }) => {
          if (this.closed) return;
          const previous = this.mode; this.mode = mode;
          if (mode === 'listening' && this.replyMuted) { this.replyMuted = false; this.session?.setVolume({ volume: 1 }); }
          if (mode === 'listening' && previous === 'speaking') { this.waiting = false; this.transcript.finish(); }
          if (mode === 'speaking' && this.transcriptAt !== undefined && !this.modeMeasured) { this.modeMeasured = true; this.metric(`${this.inputKind}_to_speaking`, 'provider-event', performance.now() - this.transcriptAt); }
          this.callbacks.state(this.waiting && mode === 'listening' ? 'thinking' : mode);
        },
        onMessage: ({ role, source, message, event_id }) => {
          if (this.closed) return;
          const isUser = role === 'user' || source === 'user';
          const providerKey = String(event_id ?? `local-${++this.counter}`);
          if (isUser && this.pendingTyped?.text === message) this.userAliases.set(providerKey, this.pendingTyped.key);
          const key = isUser ? this.userAliases.get(providerKey) || providerKey : providerKey;
          if (isUser && this.seenUsers.has(key)) { this.transcript.receive(key, 'user', message); if (this.pendingTyped?.key === key) this.pendingTyped = undefined; return; }
          if (isUser) {
            this.seenUsers.add(key); this.inputKind = 'transcript';
            this.waiting = true; this.transcriptAt = performance.now(); this.measured = false; this.modeMeasured = false;
            this.metric('user_transcript_final', 'provider-event'); this.callbacks.state('thinking');
          }
          this.transcript.receive(key, isUser ? 'user' : 'model', message);
          if (!isUser || this.pendingTyped?.text === message) this.pendingTyped = undefined;
        },
        onInterruption: ({ event_id }) => {
          if (this.closed) return;
          this.transcript.interrupt(); this.metric('provider_interruption', 'provider-event');
        },
        onAgentResponseCorrection: ({ event_id, original_agent_response, corrected_agent_response }) => {
          if (this.closed) return;
          this.transcript.correct(String(event_id), corrected_agent_response, original_agent_response);
        },
        onDisconnect: details => {
          if (this.closed) return;
          if (details.reason === 'error') this.callbacks.error('The voice connection was lost. Reconnect to continue this conversation.');
          this.end();
        },
        onError: () => this.fail('ElevenLabs could not continue this call. Check the selected voice and provider access, then reconnect.'),
        clientTools: { ask_studio: async parameters => {
          if (this.closed) return 'Call ended. Nothing was executed.';
          try {
            const result = await this.callbacks.tool('ask_studio', JSON.stringify(parameters), this.controller.signal);
            return this.closed ? 'Call ended. Nothing was executed.' : JSON.stringify(result);
          } catch { return 'The studio request failed. Nothing was executed.'; }
        } },
      });
      if (this.closed) { this.release(session); return; }
      this.session = session;
      if (session.getOutputVolume) this.meter = setInterval(() => {
        if (!this.closed && !this.replyMuted && this.mode === 'speaking' && !this.measured && this.transcriptAt !== undefined && session.getOutputVolume!() > .05) {
          this.measured = true; this.metric(`${this.inputKind}_to_output_audio_detected`, 'browser-render', performance.now() - this.transcriptAt!);
        }
      }, 50);
    } catch (error) { if (!this.closed) this.fail(error instanceof Error ? error.message : 'Microphone or connection unavailable.'); }
  }
  mute(value: boolean) { if (!this.closed) this.session?.setMicMuted(value); }
  sendText(value: string): boolean {
    const text = value.trim();
    if (this.closed || !this.connected || this.mode !== 'listening' || this.waiting || !text || text.length > 4000 || !this.session?.sendUserMessage) return false;
    const key = `typed-${++this.counter}`;
    this.session.sendUserMessage(text);
    this.pendingTyped = { key, text }; this.seenUsers.add(key); this.inputKind = 'text';
    this.waiting = true; this.transcriptAt = performance.now(); this.measured = false; this.modeMeasured = false;
    this.transcript.receive(key, 'user', text); this.callbacks.state('thinking'); this.metric('text_sent', 'client-control');
    return true;
  }
  // The SDK handles spoken interruptions. This control silences the current reply locally.
  interrupt() { if (!this.closed) { const at = performance.now(); this.replyMuted = true; this.session?.setVolume({ volume: 0 }); this.transcript.interrupt(); this.metric('playback_muted', 'client-control', performance.now() - at); } }
  private release(session: Session) {
    if (this.released.has(session)) return;
    this.released.add(session);
    session.setVolume({ volume: 0 });
    session.setMicMuted(true);
    void session.endSession().catch(() => {});
  }
  private fail(message: string) { if (!this.closed) { this.callbacks.error(message); this.end(); } }
  end() {
    if (this.closed) return;
    this.transcript.interrupt();
    this.closed = true;
    this.controller.abort(); clearTimeout(this.timeout); clearInterval(this.meter);
    if (this.session) this.release(this.session);
    this.session = undefined;
    this.callbacks.state('idle');
  }
}
