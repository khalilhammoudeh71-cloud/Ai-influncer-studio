import type { NativeMessage } from '../../shared/nativeVoice';
export class CallTranscript {
  private rows = new Map<string, { role: NativeMessage['role']; text: string; interrupted: boolean; emitted?: string }>();
  private active = new Set<string>();
  constructor(private commit: (message: NativeMessage) => void, private preview?: (message: NativeMessage) => void, private prefix: string = crypto.randomUUID()) {}
  receive(key: string, role: NativeMessage['role'], content: string, final = true) {
    if (!content.trim()) return;
    const id = `${this.prefix}-${role}-${key}`;
    const previous = this.rows.get(id);
    const row = { ...previous, role, text: content, interrupted: previous?.interrupted || false };
    this.rows.set(id, row);
    if (role === 'model' && !previous) this.active.add(id);
    const message = { id, role, content: content + (row.interrupted ? '\n[Voice reply interrupted; some text may not have played.]' : '') };
    if (!final && !row.interrupted) { this.preview?.(message); return; }
    if (row.emitted === message.content) return;
    row.emitted = message.content;
    this.commit(message);
  }
  interrupt() {
    for (const id of this.active) {
      const row = this.rows.get(id)!;
      row.interrupted = true;
      this.receive(id.slice(`${this.prefix}-${row.role}-`.length), row.role, row.text);
    }
    this.active.clear();
  }
  finish(keys?: Iterable<string>) {
    if (!keys) { this.active.clear(); return; }
    for (const key of keys) this.active.delete(`${this.prefix}-model-${key}`);
  }
  correct(key: string, content: string, original?: string) {
    let id = `${this.prefix}-model-${key}`;
    if (!this.rows.has(id) && original) id = [...this.rows].reverse().find(([, row]) => row.role === 'model' && row.text === original)?.[0] || id;
    const row = this.rows.get(id);
    if (!row) return;
    row.interrupted = true;
    this.receive(id.slice(`${this.prefix}-model-`.length), 'model', content);
  }
}
