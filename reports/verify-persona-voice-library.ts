// Manual database integration check. Uses only unique test fixtures and removes them in finally.
// Run with node --import tsx reports/verify-persona-voice-library.ts.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import router, { readPersonasForUser } from '../server/routes';
import { db } from '../server/db';
import { personas, workspaceStates } from '../shared/schema';
import { voiceStateOwner, readVoiceState, writeVoiceState } from '../server/personaVoiceStore';
import { voiceAccount } from '../server/personaVoiceLifecycle';
import { restoreSavedVoice } from '../shared/personaVoiceLibrary';

const owner = `voice-library-test-${randomUUID()}`;
const otherOwner = `voice-library-test-${randomUUID()}`;
const clientId = `voice-library-test-${randomUUID()}`;
async function call(method: string, body: any, user = owner) {
  // Exercise the production CRUD handlers, injecting a fixture identity after authentication.
  const route = router.stack.find((layer: any) => layer.route?.path === (method === 'post' ? '/personas' : '/personas/:clientId') && layer.route.methods[method]) as any;
  let status = 200;
  let data: any;
  const res = { status(code: number) { status = code; return this; }, json(value: any) { data = value; return this; } };
  await route.route.stack[0].handle({ user: { id: user }, body, params: { clientId } }, res);
  return { status, data };
}

try {
  const sampleA = `supabase-media://${owner}/audio/a.wav`;
  const sampleB = `supabase-media://${owner}/audio/b.wav`;
  const first = await call('post', { id: clientId, name: 'Voice library fixture', voiceName: 'Original Fish voice', voiceEngine: 'wiro-voice:fishaudio/s2-pro', voiceSampleUrl: sampleA, audioSamples: [{ name: 'Original', base64: sampleA }], voiceStability: 64, voiceLikeness: 92 });
  assert.equal(first.status, 200);
  assert.equal(first.data.savedVoices.length, 1);
  const second = await call('put', { ...first.data, voiceName: 'New Fish voice', voiceSampleUrl: sampleB, audioSamples: [{ name: 'New', base64: sampleB }], voiceStability: 25, savedVoices: [] });
  assert.equal(second.status, 200);
  assert.equal(second.data.savedVoices.length, 2, 'client cannot erase server-owned history');
  const [reloaded] = await readPersonasForUser(owner);
  assert.equal(reloaded.savedVoices.length, 2);
  const original = reloaded.savedVoices.find((voice: any) => voice.voiceSampleUrl === sampleA);
  const restored = await call('put', { ...reloaded, ...restoreSavedVoice(original) });
  assert.equal(restored.status, 200);
  assert.equal(restored.data.voiceSampleUrl, sampleA);
  assert.equal(restored.data.voiceStability, 64);
  assert.equal(restored.data.voiceLikeness, 92);
  assert.equal(restored.data.voiceName, 'Original Fish voice');
  assert.equal(restored.data.savedVoices.length, 2);
  assert.equal((await call('put', { ...restored.data, voiceSampleUrl: sampleB }, otherOwner)).status, 404);
  assert.deepEqual(await readPersonasForUser(otherOwner), []);
  assert.equal(await readVoiceState(otherOwner, `library:${voiceAccount(clientId)}`), undefined);
  assert.equal((await call('put', second.data)).status, 409, 'stale save must preserve latest default/history');
  const beforeRollback = await readVoiceState(owner, `library:${voiceAccount(clientId)}`);
  const rollback = new Error('fixture rollback');
  await assert.rejects(db.transaction(async (tx: any) => {
    await tx.update(personas).set({ voiceSampleUrl: sampleB }).where(eq(personas.userId, owner));
    await writeVoiceState(owner, `library:${voiceAccount(clientId)}`, [], tx);
    throw rollback;
  }), (error: Error) => error === rollback);
  assert.deepEqual(await readVoiceState(owner, `library:${voiceAccount(clientId)}`), beforeRollback);
  const [final] = await readPersonasForUser(owner);
  assert.equal(final.voiceSampleUrl, sampleA);
  assert.equal(final.savedVoices.length, 2);
  console.log('PASS: production create/update/reload/restore, immutable history, owner isolation, stale-save protection, and transaction rollback.');
} finally {
  await db.delete(personas).where(eq(personas.userId, owner));
  await db.delete(workspaceStates).where(eq(workspaceStates.userId, voiceStateOwner(owner)));
  assert.deepEqual(await readPersonasForUser(owner), []);
  console.log('PASS: all test fixtures removed.');
  await db.$client?.end();
}
