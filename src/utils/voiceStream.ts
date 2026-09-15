import { drainSseData } from './voiceStability';

/** Read framed server text independently of arbitrary network/UTF-8 boundaries. */
export async function readVoiceTextStream(
  stream: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  const onAbort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    while (true) {
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      pending += decoder.decode(value, { stream: !done });
      const frames = drainSseData(pending, done);
      pending = frames.remainder;
      for (const data of frames.data) {
        signal.throwIfAborted();
        if (data === '[DONE]') return;
        let frame: { error?: string; done?: boolean; text?: string };
        try { frame = JSON.parse(data); } catch { throw new Error('Invalid voice stream response'); }
        if (frame.error) throw new Error(frame.error);
        if (frame.done) return;
        if (typeof frame.text === 'string') onText(frame.text);
      }
      if (done) return;
    }
  } finally {
    signal.removeEventListener('abort', onAbort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** A cancelled or replaced turn can never regain ownership of the audio queue. */
export class VoiceTurnScope {
  private current?: AbortController;

  start() {
    this.cancel();
    const controller = new AbortController();
    this.current = controller;
    return {
      signal: controller.signal,
      isCurrent: () => this.current === controller && !controller.signal.aborted,
    };
  }

  cancel() {
    this.current?.abort();
    this.current = undefined;
  }
}
