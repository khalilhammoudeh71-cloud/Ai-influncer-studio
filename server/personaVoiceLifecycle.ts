import { createHash } from 'node:crypto';
import type { CloneResult } from '../shared/personaVoiceLifecycle';

export class VoiceLifecycleError extends Error {
  constructor(message: string, public statusCode = 409) { super(message); }
}
export interface VoiceOperation extends CloneResult {
  owner: string;
  account: string;
  provider: 'elevenlabs';
  createdAt: string;
  authorizedAt: string;
  model: string;
  attempts?: number;
  checkedAt?: string;
}
export interface VoiceStore {
  claim(op: VoiceOperation): Promise<boolean>;
  claimRetry(previous: VoiceOperation, next: VoiceOperation): Promise<boolean>;
  get(owner: string, id: string): Promise<VoiceOperation | undefined>;
  put(op: VoiceOperation): Promise<void>;
}
export interface ElevenVoice {
  voice_id: string; name?: string; category?: string; description?: string;
  labels?: Record<string, string>; preview_url?: string;
  voice_verification?: { requires_verification?: boolean; is_verified?: boolean };
  fine_tuning?: { state?: Record<string, string> };
}
export const voiceAccount = (apiKey: string) => createHash('sha256').update(apiKey).digest('hex');
export const VOICE_MODEL = 'eleven_turbo_v2_5';

export function voiceReadiness(voice: ElevenVoice, model = VOICE_MODEL) {
  if (voice.voice_verification?.requires_verification && !voice.voice_verification.is_verified) return 'verification_required';
  if (voice.category === 'professional' && voice.fine_tuning?.state?.[model] !== 'fine_tuned') return 'processing';
  return 'available'; // Metadata alone is not synthesis evidence.
}

function decodeSamples(samples: unknown): Array<{ bytes: Uint8Array; mime: string }> {
  // Product upload budget: 10 audio files, 20 MB total; do not silently drop files.
  if (!Array.isArray(samples) || !samples.length || samples.length > 10) throw new VoiceLifecycleError('Choose 1–10 audio files (20 MB total maximum).', 400);
  let size = 0;
  return samples.map(sample => {
    const match = typeof sample === 'string' && sample.match(/^data:(audio\/(?:mpeg|mp3|wav|x-wav|wave|mp4|m4a|x-m4a|ogg|webm|flac));base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) throw new VoiceLifecycleError('Use a supported audio file: MP3, WAV, M4A, OGG, WebM or FLAC.', 400);
    const bytes = Buffer.from(match[2], 'base64'); size += bytes.length;
    if (bytes.length < 100 || size > 20 * 1024 * 1024) throw new VoiceLifecycleError('Audio is empty or exceeds the 20 MB upload limit.', 400);
    return { bytes: new Uint8Array(bytes), mime: match[1] };
  });
}

export class VoiceLifecycle {
  private accounts = new Map<string, Promise<string>>();
  constructor(private store: VoiceStore, private transport: typeof fetch = fetch) {}
  private request(apiKey: string, path: string, init: RequestInit = {}) {
    if (!apiKey) throw new VoiceLifecycleError('ElevenLabs is not configured. Your saved voice is unchanged.', 503);
    return this.transport(`https://api.elevenlabs.io${path}`, {
      ...init, headers: { 'xi-api-key': apiKey, ...init.headers }, signal: AbortSignal.timeout(45000),
    });
  }
  async account(apiKey: string): Promise<string> {
    const fingerprint = voiceAccount(apiKey);
    let pending = this.accounts.get(fingerprint);
    if (!pending) {
      pending = (async () => {
        const response = await this.request(apiKey, '/v1/user');
        const user = response.ok ? await response.json() : null;
        if (!user?.user_id) throw new VoiceLifecycleError('Could not resolve the ElevenLabs account. Enable user-read access on the API key and try again.', 503);
        return `elevenlabs:${user.user_id}:${process.env.ELEVENLABS_WORKSPACE_ID || 'default'}`;
      })();
      this.accounts.set(fingerprint, pending);
      pending.catch(() => this.accounts.delete(fingerprint));
    }
    return pending;
  }
  async list(apiKey: string): Promise<ElevenVoice[]> {
    const voices: ElevenVoice[] = [];
    let token = '';
    const seen = new Set<string>();
    do {
      const response = await this.request(apiKey, `/v2/voices?page_size=100${token ? `&next_page_token=${encodeURIComponent(token)}` : ''}`);
      if (!response.ok) throw new VoiceLifecycleError('Could not load ElevenLabs voices. Check your account access and try again.', 503);
      const data = await response.json();
      voices.push(...(data.voices || []));
      if (!data.has_more) return voices;
      token = data.next_page_token;
      if (!token || seen.has(token)) throw new VoiceLifecycleError('Voice catalog pagination was incomplete. Refresh to try again.', 503);
      seen.add(token);
    } while (token);
    return voices;
  }
  async get(apiKey: string, id: string): Promise<ElevenVoice> {
    const response = await this.request(apiKey, `/v1/voices/${encodeURIComponent(id)}`);
    if (!response.ok) throw new VoiceLifecycleError('This voice is unavailable in the connected ElevenLabs account. Keep the saved binding and check provider access.', 409);
    const voice = await response.json();
    if (voice.voice_id !== id) throw new VoiceLifecycleError('The provider did not confirm the requested voice.');
    return voice;
  }
  async preview(apiKey: string, id: string, text: string, settings?: Record<string, number>, model = VOICE_MODEL, languageCode?: string, dictionaries:Array<{pronunciation_dictionary_id:string;version_id:string}>=[]) {
    const voice = await this.get(apiKey, id);
    const status = voiceReadiness(voice, model);
    if (status !== 'available') throw new VoiceLifecycleError(status === 'verification_required' ? 'Complete speaker verification in ElevenLabs, then check again.' : 'This voice is still processing in ElevenLabs. Check again later.');
    const response = await this.request(apiKey, `/v1/text-to-speech/${encodeURIComponent(id)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 500), model_id: model, ...(languageCode ? { language_code: languageCode } : {}), ...(dictionaries.length?{pronunciation_dictionary_locators:dictionaries}:{}), ...(settings ? { voice_settings: settings } : {}) }),
    });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) throw new VoiceLifecycleError('ElevenLabs could not synthesize this voice. Check verification, quota and model access, then retry.');
    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.length < 100) throw new VoiceLifecycleError('ElevenLabs returned empty audio. Check again later.');
    return `data:audio/mpeg;base64,${audio.toString('base64')}`;
  }
  async clone(input: { owner: string; apiKey: string; name: string; description?: string; speakerAuthorized: boolean; retryRejected?: boolean; sampleBase64s: unknown }): Promise<VoiceOperation> {
    if (!input.speakerAuthorized) throw new VoiceLifecycleError('Confirm that you are authorized to clone the speaker’s voice.', 400);
    if (!input.name?.trim()) throw new VoiceLifecycleError('Enter a voice name.', 400);
    if (!input.apiKey) throw new VoiceLifecycleError('ElevenLabs is not configured.', 503);
    const samples = decodeSamples(input.sampleBase64s);
    const account = await this.account(input.apiKey);
    // Identical recordings are one enrollment even if double-clicked, renamed or retried after a restart.
    const hash = createHash('sha256').update(input.owner).update(account);
    const sampleHashes = [...new Set(samples.map(sample => createHash('sha256').update(sample.bytes).digest('hex')))].sort();
    for (const digest of sampleHashes) hash.update(digest);
    const id = hash.digest('hex');
    const now = new Date().toISOString();
    let operation: VoiceOperation = { id, name: input.name.trim().slice(0, 100), owner: input.owner, account, provider: 'elevenlabs', status: 'submitting', createdAt: now, authorizedAt: now, model: VOICE_MODEL, attempts: 1 };
    if (!await this.store.claim(operation)) {
      const prior = (await this.store.get(input.owner, id))!;
      if (!input.retryRejected || prior.status !== 'failed' || (prior.attempts || 1) >= 3) return prior;
      operation.attempts = (prior.attempts || 1) + 1;
      if (!await this.store.claimRetry(prior, operation)) return (await this.store.get(input.owner, id))!;
    }
    const marker = `[studio-operation:${id}]`;
    const form = new FormData();
    form.append('name', operation.name);
    form.append('description', `${(input.description || '').slice(0, 400)} ${marker}`);
    samples.forEach((sample, i) => form.append('files', new Blob([sample.bytes as BlobPart], { type: sample.mime }), `sample-${i + 1}.${sample.mime.split('/')[1]}`));
    try {
      const response = await this.request(input.apiKey, '/v1/voices/add', { method: 'POST', body: form });
      if (!response.ok) {
        operation.status = response.status >= 500 || response.status === 408 ? 'unknown' : 'failed';
        operation.message = `ElevenLabs returned ${response.status}. Check your cloning tier, quota and samples in ElevenLabs. No replacement was assigned.`;
      } else {
        const result = await response.json();
        if (!result.voice_id) throw new Error('Clone response has no ID');
        operation.voiceId = result.voice_id;
        operation.status = result.requires_verification ? 'verification_required' : 'processing';
        operation.message = result.requires_verification ? 'Complete speaker verification in ElevenLabs, then check status.' : 'Checking synthesis readiness.';
      }
    } catch {
      operation.status = 'unknown';
      operation.message = 'The submission outcome is unknown. Check status to reconcile it; do not create another clone.';
    }
    await this.store.put(operation);
    if (operation.status === 'processing') operation = await this.check(operation, input.apiKey);
    return operation;
  }
  private async check(operation: VoiceOperation, apiKey: string) {
    try {
      await this.preview(apiKey, operation.voiceId!, 'Hello. This is a short check of my voice.');
      operation.status = 'ready'; operation.checkedAt = new Date().toISOString(); operation.message = 'Voice is ready to audition and select.';
    } catch (error) {
      operation.status = error instanceof Error && /verification/i.test(error.message) && /Complete speaker/.test(error.message) ? 'verification_required' : 'processing';
      operation.message = error instanceof Error ? error.message : 'Readiness check failed. Check again later.';
    }
    await this.store.put(operation);
    return operation;
  }
  async reconcile(owner: string, apiKey: string, id: string) {
    const operation = await this.store.get(owner, id);
    if (!operation) throw new VoiceLifecycleError('Clone operation not found.', 404);
    if (operation.account !== await this.account(apiKey)) throw new VoiceLifecycleError('The connected provider account changed. Reconnect the original account.');
    if (operation.status === 'failed' && !operation.voiceId) return operation;
    // Do not race a still-running submitter. A crashed/expired submission becomes reconcilable.
    if (operation.status === 'submitting' && Date.now() - Date.parse(operation.createdAt) < 60000) return operation;
    if (!operation.voiceId) {
      const voices = (await this.list(apiKey)).filter(v => v.description?.includes(`[studio-operation:${id}]`));
      if (voices.length !== 1) return { ...operation, status: 'unknown' as const, message: 'No unique matching voice found yet. Check ElevenLabs before starting another enrollment.' };
      operation.voiceId = voices[0].voice_id;
    }
    return this.check(operation, apiKey);
  }
}
