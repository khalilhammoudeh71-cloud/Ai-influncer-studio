import { mergeVoiceTranscriptSegments } from './voiceStability';

/** Keep unfinished speech together when the caller resumes during a recheck. */
export class VoiceRecheck {
  private pending?: { text: string; start: number; controller: AbortController };
  begin(text: string, start: number) {
    const previous = this.pending;
    previous?.controller.abort();
    const turn = {
      text: previous ? mergeVoiceTranscriptSegments(previous.text, text) : text,
      start: previous ? Math.min(previous.start, start) : start,
      controller: new AbortController(),
    };
    this.pending = turn;
    return turn;
  }
  current(controller: AbortController) { return this.pending?.controller === controller && !controller.signal.aborted; }
  interrupt() { this.pending?.controller.abort(); }
  finish(controller: AbortController) { if (this.pending?.controller === controller) this.pending = undefined; }
  reset() { this.interrupt(); this.pending = undefined; }
}
export const audioRecheckEnabled = (saved: string | null) => saved !== 'off';
