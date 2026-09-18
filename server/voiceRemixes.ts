import { createHash } from 'node:crypto';
import { Router, type Response } from 'express';
import type { AuthenticatedRequest } from './auth';
import { VoiceLifecycleError, type ElevenVoice } from './personaVoiceLifecycle';
import type { VoiceRemixInput, VoiceRemixResult, SaveRemixedVoiceInput, SavedRemixedVoiceResult } from '../shared/voiceRemix';

type Store = {
  get(owner: string, key: string): Promise<any>;
  claim(owner: string, key: string, value: unknown): Promise<boolean>;
  put(owner: string, key: string, value: unknown): Promise<void>;
  replace(owner: string, key: string, previous: unknown, next: unknown): Promise<boolean>;
};
type PreviewOperation = VoiceRemixResult & { owner: string; account: string; sourceVoiceId: string; requestHash: string; createdAt: string };
type SaveOperation = SavedRemixedVoiceResult & { id: string; owner: string; account: string; operationId: string; generatedVoiceId: string; name: string; description: string; createdAt: string; attempts: number };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const OPERATION_ID = /^[A-Za-z0-9_-]{16,80}$/;
const SAVE_WAIT_MS = 65_000;
const unknownPreview = 'The remix outcome is not confirmed. Check status or the ElevenLabs history before generating again. Your original voice is unchanged.';
const unknownSave = 'The save outcome is not confirmed. Check save status to recover the voice; do not submit another save.';
const previewResult = (op: PreviewOperation): VoiceRemixResult => ({ operationId: op.operationId, status: op.status, previews: op.previews, text: op.text, message: op.message });
const saveResult = (op: SaveOperation): SavedRemixedVoiceResult => ({ status: op.status, ...(op.status === 'ready' ? { voiceId: op.voiceId, name: op.name } : {}), message: op.message });

function requiredText(value: unknown, min: number, max: number, label: string): string {
  if (typeof value !== 'string') throw new VoiceLifecycleError(`${label} must contain ${min}–${max} characters.`, 400);
  const text = value.trim(), length = [...text].length;
  if (length < min || length > max) throw new VoiceLifecycleError(`${label} must contain ${min}–${max} characters.`, 400);
  return text;
}
function validateId(value: unknown, operation = false): string {
  if (typeof value !== 'string' || !(operation ? OPERATION_ID : ID).test(value)) throw new VoiceLifecycleError(operation ? 'Use a valid remix operation ID.' : 'Choose a valid voice.', 400);
  return value;
}
function providerFailure(status: number, saving = false) {
  if (status === 401 || status === 403) return 'ElevenLabs access is unavailable. Check the server connection and voice permissions in Settings.';
  if (status === 402 || status === 429) return 'ElevenLabs quota or capacity is unavailable. Check your plan and usage before trying again.';
  return saving ? 'ElevenLabs rejected this save. Check the preview, voice name and description in ElevenLabs.' : 'ElevenLabs rejected this remix. Check that the original voice supports remixing and review your description.';
}

export class VoiceRemixes {
  constructor(private store: Store, private provider: { account(apiKey: string): Promise<string>; list(apiKey: string): Promise<ElevenVoice[]> }, private transport: typeof fetch = fetch) {}
  private async account(apiKey: string) {
    if (!apiKey) throw new VoiceLifecycleError('ElevenLabs is not configured. Your original voice is unchanged.', 503);
    try { return await this.provider.account(apiKey); }
    catch { throw new VoiceLifecycleError('Could not verify the ElevenLabs account. Check the connection and user-read permission in Settings.', 503); }
  }
  private request(apiKey: string, path: string, body: unknown) {
    return this.transport(`https://api.elevenlabs.io${path}`, { method: 'POST', headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(45_000), redirect: 'error' });
  }
  private async readPreview(owner: string, apiKey: string, operationId: string) {
    validateId(operationId, true);
    const op: PreviewOperation | undefined = await this.store.get(owner, `remix:${operationId}`);
    if (!op || op.owner !== owner) throw new VoiceLifecycleError('Remix preview not found in your account.', 404);
    if (op.account !== await this.account(apiKey)) throw new VoiceLifecycleError('Reconnect the ElevenLabs account used for this remix.', 409);
    return op;
  }
  async remix(owner: string, apiKey: string, input: VoiceRemixInput, authorizeVoice: (voiceId: string) => Promise<void>): Promise<VoiceRemixResult> {
    const design = input.mode === 'design';
    const operationId = validateId(input.operationId, true), voiceId = design ? 'voice-design' : validateId(input.voiceId);
    const description = requiredText(input.description, design ? 20 : 5, 1000, 'Voice description');
    const designSettings:Record<string,any> = design ? {model_id:input.designModel || 'eleven_ttv_v3',guidance_scale:input.guidanceScale ?? 5,loudness:input.loudness ?? 0.5,should_enhance:input.enhance === true,...(input.seed === undefined ? {} : {seed:input.seed})} : {};
    if(design && (!['eleven_multilingual_ttv_v2','eleven_ttv_v3'].includes(designSettings.model_id!) || !Number.isFinite(designSettings.guidance_scale) || designSettings.guidance_scale! < 0 || designSettings.guidance_scale! > 100 || !Number.isFinite(designSettings.loudness) || designSettings.loudness! < -1 || designSettings.loudness! > 1 || (input.seed !== undefined && (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 2147483647)))) throw new VoiceLifecycleError('Choose valid Voice Design settings.',400);
    const text = input.text === undefined || input.text === '' ? undefined : requiredText(input.text, 100, 1000, 'Preview text');
    if(!design) await authorizeVoice(voiceId);
    const account = await this.account(apiKey), requestHash = hash(JSON.stringify([voiceId, description, text || '',...(design ? [designSettings] : [])]));
    const op: PreviewOperation = { operationId, owner, account, sourceVoiceId: voiceId, requestHash, createdAt: new Date().toISOString(), status: 'submitting', previews: [] };
    if (!await this.store.claim(owner, `remix:${operationId}`, op)) {
      const existing = await this.readPreview(owner, apiKey, operationId);
      if (existing.requestHash !== requestHash) throw new VoiceLifecycleError('This remix operation already has different inputs. Check its status before starting a new remix.', 409);
      return this.status(owner, apiKey, operationId);
    }
    try {
      const response = await this.request(apiKey, design ? '/v1/text-to-voice/design?output_format=mp3_44100_128' : `/v1/text-to-voice/${encodeURIComponent(voiceId)}/remix?output_format=mp3_44100_128`, { voice_description: description, ...(text ? { text, auto_generate_text: false } : { auto_generate_text: true }), stream_previews: false,...designSettings });
      if (!response.ok) {
        op.status = response.status >= 500 || response.status === 408 ? 'unknown' : 'failed';
        op.message = op.status === 'unknown' ? unknownPreview : providerFailure(response.status);
      } else {
        const data = await response.json();
        if (!Array.isArray(data.previews) || !data.previews.length || data.previews.length > 10) throw new Error('Invalid preview response');
        let bytes = 0;
        const seen = new Set<string>();
        op.previews = data.previews.map((preview: any) => {
          const generatedVoiceId = validateId(preview.generated_voice_id);
          if (seen.has(generatedVoiceId)) throw new Error('Duplicate preview ID');
          seen.add(generatedVoiceId);
          if (typeof preview.audio_base_64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(preview.audio_base_64)) throw new Error('Invalid preview audio');
          const audio = Buffer.from(preview.audio_base_64, 'base64'); bytes += audio.length;
          if (!audio.length || bytes > 20 * 1024 * 1024 || (preview.media_type && preview.media_type !== 'audio/mpeg')) throw new Error('Invalid preview format');
          return { generatedVoiceId, audioUrl: `data:audio/mpeg;base64,${audio.toString('base64')}` };
        });
        op.text = typeof data.text === 'string' ? data.text.slice(0, 4000) : text;
        op.status = 'ready'; op.message = 'Listen to the previews, then save the one you want. Your original voice remains selected.';
      }
    } catch { op.status = 'unknown'; op.previews = []; op.message = unknownPreview; }
    await this.store.put(owner, `remix:${operationId}`, op);
    return previewResult(op);
  }
  async status(owner: string, apiKey: string, operationId: string): Promise<VoiceRemixResult> {
    const op = await this.readPreview(owner, apiKey, operationId);
    if (op.status === 'submitting' && Date.now() - Date.parse(op.createdAt) > SAVE_WAIT_MS) return { ...previewResult(op), status: 'unknown', message: unknownPreview };
    return previewResult(op);
  }
  private async candidate(owner: string, apiKey: string, operationId: string, generatedVoiceId: string) {
    validateId(generatedVoiceId);
    const preview = await this.readPreview(owner, apiKey, operationId);
    if (preview.status !== 'ready' || !preview.previews.some(item => item.generatedVoiceId === generatedVoiceId)) throw new VoiceLifecycleError('Choose a ready preview generated in your account.', 403);
    return preview;
  }
  private saveKey(account: string, generatedVoiceId: string) { return `remix-save:${hash(JSON.stringify([account, generatedVoiceId]))}`; }
  private async finish(op: SaveOperation) {
    // Only server-owned records grant access. Persona/agent bindings are untouched.
    await this.store.put(op.owner, `remix-voice:${hash(op.voiceId!)}`, { owner: op.owner, account: op.account, voiceId: op.voiceId, status: 'ready', sourceOperationId: op.operationId });
    op.status = 'ready'; op.message = 'New voice saved to your library. Choose it explicitly to replace a persona voice.';
    await this.store.put(op.owner, this.saveKey(op.account, op.generatedVoiceId), op);
    return saveResult(op);
  }
  async save(owner: string, apiKey: string, input: SaveRemixedVoiceInput): Promise<SavedRemixedVoiceResult> {
    const name = requiredText(input.name, 1, 100, 'Voice name'), description = requiredText(input.description, 20, 1000, 'Voice description');
    const preview = await this.candidate(owner, apiKey, input.operationId, input.generatedVoiceId);
    const key = this.saveKey(preview.account, input.generatedVoiceId);
    const op: SaveOperation = { id: key.slice('remix-save:'.length), owner, account: preview.account, operationId: input.operationId, generatedVoiceId: input.generatedVoiceId, name, description, createdAt: new Date().toISOString(), status: 'submitting', attempts: 1 };
    if (!await this.store.claim(owner, key, op)) {
      const previous: SaveOperation = await this.store.get(owner, key);
      if (input.retryRejected !== true || previous?.status !== 'failed' || previous.attempts >= 3) return this.saveStatus(owner, apiKey, input.operationId, input.generatedVoiceId);
      op.attempts = previous.attempts + 1;
      if (!await this.store.replace(owner, key, previous, op)) return this.saveStatus(owner, apiKey, input.operationId, input.generatedVoiceId);
    }
    try {
      const response = await this.request(apiKey, '/v1/text-to-voice', { voice_name: name, voice_description: description, generated_voice_id: input.generatedVoiceId, labels: { studio_remix: op.id.slice(0, 32) } });
      if (!response.ok) {
        op.status = response.status >= 500 || response.status === 408 ? 'unknown' : 'failed';
        op.message = op.status === 'unknown' ? unknownSave : providerFailure(response.status, true);
      } else {
        const data = await response.json(); op.voiceId = validateId(data.voice_id);
      }
    } catch { op.status = 'unknown'; op.message = unknownSave; }
    // Persist the remote ID before registering ownership so a storage interruption is recoverable.
    await this.store.put(owner, key, op);
    return op.voiceId ? this.finish(op) : saveResult(op);
  }
  async saveStatus(owner: string, apiKey: string, operationId: string, generatedVoiceId: string): Promise<SavedRemixedVoiceResult> {
    const preview = await this.candidate(owner, apiKey, operationId, generatedVoiceId);
    const op: SaveOperation | undefined = await this.store.get(owner, this.saveKey(preview.account, generatedVoiceId));
    if (!op || op.owner !== owner || op.account !== preview.account) throw new VoiceLifecycleError('No save operation was found for this preview.', 404);
    if (op.voiceId) return this.finish(op);
    if (op.status === 'failed' || (op.status === 'submitting' && Date.now() - Date.parse(op.createdAt) < SAVE_WAIT_MS)) return saveResult(op);
    let voices: ElevenVoice[];
    try { voices = await this.provider.list(apiKey); }
    catch { return { status: 'unknown', message: 'Could not check the ElevenLabs library. Retry the status check; no new save was submitted.' }; }
    const matches = voices.filter(voice => voice.labels?.studio_remix === op.id.slice(0, 32));
    if (matches.length === 1 && ID.test(matches[0].voice_id)) {
      op.voiceId = matches[0].voice_id;
      await this.store.put(owner, this.saveKey(op.account, generatedVoiceId), op);
      return this.finish(op);
    }
    return { status: 'unknown', message: 'No unique saved voice was found yet. Check ElevenLabs or retry this status check before starting another save.' };
  }
}

export function createVoiceRemixRouter(deps: { service: VoiceRemixes; apiKey(): string; authorizeVoice(req: AuthenticatedRequest, voiceId: string): Promise<void> }) {
  const router = Router();
  router.use((req: AuthenticatedRequest, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!req.user?.id) return res.status(401).json({ error: 'Sign in to remix a voice.' });
    next();
  });
  const failure = (res: Response, error: unknown) => res.status(error instanceof VoiceLifecycleError ? error.statusCode : 503).json({ error: error instanceof VoiceLifecycleError ? error.message : 'Voice remixing is temporarily unavailable. Check the existing operation status before retrying.' });
  router.post('/', async (req: AuthenticatedRequest, res) => {
    try { return res.json(await deps.service.remix(req.user.id, deps.apiKey(), req.body || {}, id => deps.authorizeVoice(req, id))); }
    catch (error) { return failure(res, error); }
  });
  router.get('/:operationId', async (req: AuthenticatedRequest, res) => {
    try { return res.json(await deps.service.status(req.user.id, deps.apiKey(), String(req.params.operationId))); }
    catch (error) { return failure(res, error); }
  });
  router.post('/:operationId/save', async (req: AuthenticatedRequest, res) => {
    try { return res.json(await deps.service.save(req.user.id, deps.apiKey(), { ...req.body, operationId: String(req.params.operationId) })); }
    catch (error) { return failure(res, error); }
  });
  router.get('/:operationId/saves/:generatedVoiceId', async (req: AuthenticatedRequest, res) => {
    try { return res.json(await deps.service.saveStatus(req.user.id, deps.apiKey(), String(req.params.operationId), String(req.params.generatedVoiceId))); }
    catch (error) { return failure(res, error); }
  });
  return router;
}
