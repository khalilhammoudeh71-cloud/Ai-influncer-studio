export type PilotChatMessage = {id: string; role: 'user'|'model'; content: string};
export class SpeechEngineTranscript {
  private messages = new Map<string, PilotChatMessage>();
  private originals = new Map<string, string>();
  private counter = 0;
  private lastModel?: string;
  constructor(private prefix: string) {}
  receive(role: 'user'|'model', content: string, eventId?: number): PilotChatMessage {
    const id = `${this.prefix}-${role}-${eventId ?? `local-${++this.counter}`}`;
    const message = {id,role,content};
    this.messages.set(id,message); this.originals.set(id,content);
    if (role==='model') this.lastModel=id;
    return message;
  }
  interrupt(eventId: number): PilotChatMessage | undefined {
    const matching=`${this.prefix}-model-${eventId}`;
    const id=this.messages.has(matching)?matching:this.lastModel;
    if (!id) return;
    const message={...this.messages.get(id)!,content:this.originals.get(id)+'\n[Voice reply interrupted; some text may not have played.]'};
    this.messages.set(id,message);return message;
  }
  correct(eventId: number, original: string, corrected: string): PilotChatMessage | undefined {
    const matching=`${this.prefix}-model-${eventId}`;
    const id=this.messages.has(matching)?matching:[...this.originals].reverse().find(([id,text])=>text===original && this.messages.get(id)?.role==='model')?.[0];
    if (!id) return;
    const message={...this.messages.get(id)!,content:corrected+'\n[Voice reply interrupted.]'};
    this.messages.set(id,message);this.originals.set(id,corrected);return message;
  }
}
