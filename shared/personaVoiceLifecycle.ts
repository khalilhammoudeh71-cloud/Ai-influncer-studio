export const voiceFields = ['voiceId', 'voiceEngine', 'voiceName', 'voiceSampleUrl', 'audioSamples', 'voiceReferenceText', 'voicePrompt', 'voiceLikeness', 'voiceStability', 'voiceStyleExaggeration', 'voiceSpeakingSpeed', 'elevenLabsSpeechModel', 'elevenLabsLanguageOverride', 'elevenLabsSpeakerBoost', 'elevenLabsPronunciationDictionaries'] as const;
export function mergeVoiceDraft(saved: Record<string, any>, draft: Record<string, any>) {
  return Object.fromEntries(voiceFields.flatMap(key => {
    const value = draft[key] === undefined ? saved[key] : draft[key];
    return value === undefined ? [] : [[key, value]];
  }));
}

// A clone response can only select a voice while the originating draft is current.
export class VoiceDraftGuard {
  private revision = 0;
  begin() { return ++this.revision; }
  change() { this.revision++; }
  isCurrent(revision: number) { return revision === this.revision; }
}

// No private audio cache: each audition is authorized by the backend.
export class LatestVoicePreview {
  private revision = 0;
  private audio?: { pause(): void };
  stop() { this.revision++; this.audio?.pause(); this.audio = undefined; }
  async play(load: () => Promise<string>, start: (url: string) => { pause(): void }) {
    this.stop();
    const revision = this.revision;
    try {
      const url = await load();
      if (revision !== this.revision) return false;
      this.audio = start(url);
      return true;
    } catch (error) {
      if (revision === this.revision) throw error;
      return false;
    }
  }
}

export type CloneStatus = 'submitting' | 'unknown' | 'processing' | 'verification_required' | 'ready' | 'failed';
export interface CloneResult {
  id: string;
  name: string;
  status: CloneStatus;
  voiceId?: string;
  message?: string;
  engine?: string;
  assetKind?: 'speech' | 'singing';
  audioUrl?: string;
}
