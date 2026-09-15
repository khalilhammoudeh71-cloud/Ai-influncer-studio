import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceLifecycle, type VoiceOperation, type VoiceStore } from './personaVoiceLifecycle';

function fixture(options: { timeout?: boolean; verification?: boolean; speechFails?: boolean; rejectClone?: boolean } = {}) {
  const rows = new Map<string, VoiceOperation>();
  const remote: any[] = [];
  const requests: string[] = [];
  const store: VoiceStore = {
    async claim(op) { const key = `${op.owner}:${op.id}`; if (rows.has(key)) return false; rows.set(key, structuredClone(op)); return true; },
    async claimRetry(previous, next) { const key = `${previous.owner}:${previous.id}`; if (JSON.stringify(rows.get(key)) !== JSON.stringify(previous)) return false; rows.set(key, structuredClone(next)); return true; },
    async get(owner, id) { return structuredClone(rows.get(`${owner}:${id}`)); },
    async put(op) { rows.set(`${op.owner}:${op.id}`, structuredClone(op)); },
  };
  const transport = async (url: string | URL | Request, init?: RequestInit) => {
    const endpoint = String(url); requests.push(`${init?.method || 'GET'} ${endpoint}`);
    if (endpoint.endsWith('/v1/user')) return Response.json({ user_id: String((init?.headers as any)['xi-api-key']).replace('-rotated', '') });
    if (endpoint.endsWith('/voices/add')) {
      if (options.rejectClone) return Response.json({ detail: { message: 'Quota exceeded' } }, { status: 429 });
      const form = init!.body as FormData;
      assert.equal(form.getAll('files').length, 3, 'every supplied sample reaches provider');
      const voice = { voice_id: 'cloned-voice', name: form.get('name'), description: form.get('description'), category: 'cloned', voice_verification: { requires_verification: !!options.verification, is_verified: false } };
      remote.push(voice);
      if (options.timeout) throw new Error('response lost');
      return Response.json({ voice_id: voice.voice_id, requires_verification: !!options.verification });
    }
    if (endpoint.includes('/v2/voices')) return Response.json({ voices: remote, has_more: false });
    if (endpoint.includes('/text-to-speech/')) return options.speechFails ? Response.json({ detail: { message: 'Voice unavailable' } }, { status: 422 }) : new Response(new Uint8Array(500), { headers: { 'content-type': 'audio/mpeg' } });
    return Response.json(remote[0] || { voice_id: 'saved-clone', category: 'cloned' });
  };
  const service = new VoiceLifecycle(store, transport as typeof fetch);
  const input = { owner: 'alice', apiKey: 'workspace-a', name: 'My voice', speakerAuthorized: true, sampleBase64s: Array(3).fill(`data:audio/wav;base64,${Buffer.alloc(200, 1).toString('base64')}`) };
  return { service, input, rows, requests, remote };
}

test('duplicate submissions create one remote clone and persist readiness evidence', async () => {
  const { service, input, requests } = fixture();
  const results = await Promise.all([service.clone(input), service.clone(input)]);
  const ready = results.find(r => r.status === 'ready');
  assert.equal(ready?.voiceId, 'cloned-voice');
  assert.equal((await service.clone(input)).id, ready?.id);
  assert.equal(requests.filter(r => r.startsWith('POST') && r.endsWith('/voices/add')).length, 1);
});

test('lost clone response reconciles the same remote voice without resubmitting', async () => {
  const { service, input, requests } = fixture({ timeout: true });
  const unknown = await service.clone(input);
  assert.equal(unknown.status, 'unknown');
  const recovered = await service.reconcile(input.owner, input.apiKey, unknown.id);
  assert.equal(recovered.status, 'ready');
  assert.equal(recovered.voiceId, 'cloned-voice');
  await service.clone(input);
  assert.equal(requests.filter(r => r.endsWith('/voices/add')).length, 1);
});

test('verification-required clone is not ready and cannot be auditioned', async () => {
  const { service, input, requests } = fixture({ verification: true });
  assert.equal((await service.clone(input)).status, 'verification_required');
  assert.equal(requests.some(r => r.includes('/text-to-speech/')), false);
});

test('accepted upload with failed synthesis stays recoverable instead of ready', async () => {
  const { service, input } = fixture({ speechFails: true });
  const result = await service.clone(input);
  assert.equal(result.status, 'processing');
  assert.equal(result.voiceId, 'cloned-voice');
});

test('missing authorization and invalid audio fail before submitting', async () => {
  const { service, input, requests } = fixture();
  await assert.rejects(service.clone({ ...input, speakerAuthorized: false }), /authoriz/i);
  await assert.rejects(service.clone({ ...input, sampleBase64s: ['data:video/mp4;base64,AAAA'] }), /audio/i);
  assert.equal(requests.length, 0);
});

test('operation lookup is scoped to owner and provider account', async () => {
  const { service, input } = fixture();
  const result = await service.clone(input);
  await assert.rejects(service.reconcile('bob', input.apiKey, result.id), /not found/i);
  await assert.rejects(service.reconcile('alice', 'workspace-b', result.id), /account/i);
});

test('editing unrelated fields never probes or replaces an unavailable saved voice', async () => {
  const { prepareVoiceSave } = await import('./personaVoiceSave');
  const result = await prepareVoiceSave({ voiceId: 'old', voiceEngine: 'elevenlabs', voiceRevision: '1', voiceStability: 73 }, { name: 'New name', voiceRevision: '1' }, async () => { throw new Error('unavailable'); });
  assert.equal(result.voiceId, 'old');
  assert.equal(result.voiceStability, 73);
});

test('replacement failure and stale revision leave saved binding untouched', async () => {
  const { prepareVoiceSave } = await import('./personaVoiceSave');
  const saved = { voiceId: 'old', voiceEngine: 'elevenlabs', voiceRevision: '2' };
  await assert.rejects(prepareVoiceSave(saved, { voiceId: 'new', voiceRevision: '1' }, async () => {}), /changed/i);
  await assert.rejects(prepareVoiceSave(saved, { voiceId: 'new', voiceRevision: '2' }, async () => { throw new Error('not ready'); }), /not ready/);
  assert.equal(saved.voiceId, 'old');
});


test('reordering recordings cannot bypass enrollment deduplication', async () => {
  const { service, input, requests } = fixture();
  const samples = [1, 2, 3].map(n => `data:audio/wav;base64,${Buffer.alloc(200, n).toString('base64')}`);
  const original = await service.clone({ ...input, sampleBase64s: samples });
  const reordered = await service.clone({ ...input, sampleBase64s: [...samples].reverse() });
  assert.equal(reordered.id, original.id);
  assert.equal(requests.filter(r => r.endsWith('/voices/add')).length, 1);
});

test('explicit retry after a definite rejection succeeds without retrying unknown outcomes', async () => {
  const options = { rejectClone: true };
  const { service, input, requests } = fixture(options);
  const rejected = await service.clone(input);
  assert.equal(rejected.status, 'failed');
  assert.equal((await service.reconcile(input.owner, input.apiKey, rejected.id)).status, 'failed');
  options.rejectClone = false;
  assert.equal((await service.clone(input)).status, 'failed');
  assert.equal((await service.clone({ ...input, retryRejected: true })).status, 'ready');
  assert.equal(requests.filter(r => r.endsWith('/voices/add')).length, 2);
});

test('rotating a key in the same account retains operation ownership', async () => {
  const { service, input } = fixture();
  const original = await service.clone(input);
  const afterRotation = await service.reconcile(input.owner, 'workspace-a-rotated', original.id);
  assert.equal(afterRotation.voiceId, original.voiceId);
  assert.equal(afterRotation.status, 'ready');
});

test('legacy form defaults do not force replacement of an unavailable saved voice', async () => {
  const { prepareVoiceSave } = await import('./personaVoiceSave');
  const result = await prepareVoiceSave({ voiceId: 'old', voiceEngine: 'elevenlabs', voiceRevision: '1' }, { voiceId: 'old', voiceEngine: 'elevenlabs', voiceRevision: '1', voiceStability: 75, voiceLikeness: 85 }, async () => { throw new Error('unavailable'); });
  assert.equal(result.voiceId, 'old');
});
