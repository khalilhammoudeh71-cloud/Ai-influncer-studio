import { and, eq, like, sql } from 'drizzle-orm';
import { db } from './db';
import { workspaceStates, personas } from '../shared/schema';
import { VoiceLifecycle, VoiceLifecycleError, voiceAccount, type VoiceStore, type VoiceOperation } from './personaVoiceLifecycle';

// Server-owned namespace in the existing workspace store. It cannot equal an
// auth.uid(), so browser RLS and /workspace-state cannot read or forge records.
export const voiceStateOwner = (owner: string) => `voice-lifecycle:${owner}`;
export async function readVoiceState(owner: string, key: string, connection = db) {
  if (!connection) throw new VoiceLifecycleError('Voice persistence is unavailable. Try again later.', 503);
  const [row] = await connection.select().from(workspaceStates).where(and(eq(workspaceStates.userId, voiceStateOwner(owner)), eq(workspaceStates.stateKey, key)));
  return row ? JSON.parse(row.value) : undefined;
}
export async function writeVoiceState(owner: string, key: string, value: unknown, connection = db) {
  await connection.insert(workspaceStates).values({ userId: voiceStateOwner(owner), stateKey: key, value: JSON.stringify(value) }).onConflictDoUpdate({
    target: [workspaceStates.userId, workspaceStates.stateKey], set: { value: JSON.stringify(value), updatedAt: new Date() },
  });
}
export async function ownedVoiceOperations(owner: string): Promise<VoiceOperation[]> {
  if (!db) throw new VoiceLifecycleError('Voice persistence is unavailable.', 503);
  const rows = await db.select().from(workspaceStates).where(and(eq(workspaceStates.userId, voiceStateOwner(owner)), like(workspaceStates.stateKey, 'clone:%')));
  return rows.map((row: any) => JSON.parse(row.value));
}
export const voiceStore: VoiceStore = {
  async claim(operation) {
    if (!db) throw new VoiceLifecycleError('Voice persistence is unavailable. No clone was submitted.', 503);
    const rows = await db.insert(workspaceStates).values({ userId: voiceStateOwner(operation.owner), stateKey: `clone:${operation.id}`, value: JSON.stringify(operation) }).onConflictDoNothing().returning();
    return rows.length === 1;
  },
  async claimRetry(previous, next) {
    const rows = await db.update(workspaceStates).set({ value: JSON.stringify(next), updatedAt: new Date() }).where(and(eq(workspaceStates.userId, voiceStateOwner(previous.owner)), eq(workspaceStates.stateKey, `clone:${previous.id}`), eq(workspaceStates.value, JSON.stringify(previous)))).returning();
    return rows.length === 1;
  },
  get: (owner, id) => readVoiceState(owner, `clone:${id}`),
  put: operation => writeVoiceState(operation.owner, `clone:${operation.id}`, operation),
};
export const personaVoices = new VoiceLifecycle(voiceStore);


let bootstrapPromise: Promise<void> | undefined;
export function ensureLegacyVoiceAccess(): Promise<void> {
  if (!bootstrapPromise) bootstrapPromise = (async () => {
    if (!db) throw new VoiceLifecycleError('Voice persistence is unavailable.', 503);
    if (await readVoiceState('registry', 'legacy-bindings-v1')) return;
    const apiKey = process.env.ELEVENLABS_API_KEY || process.env.Elevenlabs_api_key || '';
    // Seal the owner/ID snapshot even when credentials are absent or revoked.
    // An unresolved legacy account is resolved once, against provider metadata.
    const account = apiKey ? await personaVoices.account(apiKey).catch(() => undefined) : undefined;
    await db.transaction(async (tx: any) => {
      await tx.execute(sql`select pg_advisory_xact_lock(73190214)`);
      if (await readVoiceState('registry', 'legacy-bindings-v1', tx)) return;
      const existing = await tx.select().from(personas);
      for (const row of existing) {
        if (!row.userId || !/^[a-zA-Z0-9]{18,24}$/.test(row.voiceId || '') || (row.voiceEngine && !row.voiceEngine.startsWith('elevenlabs') && !row.voiceEngine.startsWith('eleven_'))) continue;
        await writeVoiceState(row.userId, `legacy:${voiceAccount(row.voiceId)}`, { voiceId: row.voiceId, account, owner: row.userId }, tx);
      }
      await writeVoiceState('registry', 'legacy-bindings-v1', { completedAt: new Date().toISOString() }, tx);
    });
  })().catch(error => { bootstrapPromise = undefined; throw error; });
  return bootstrapPromise;
}
export async function accessiblePrivateVoiceIds(owner: string, account: string): Promise<Set<string>> {
  await ensureLegacyVoiceAccess();
  const rows = await db.select().from(workspaceStates).where(eq(workspaceStates.userId, voiceStateOwner(owner)));
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row.stateKey.startsWith('clone:') && !row.stateKey.startsWith('legacy:')) continue;
    let item = JSON.parse(row.value);
    if (row.stateKey.startsWith('legacy:') && !item.account && item.voiceId) {
      try {
        await personaVoices.get(process.env.ELEVENLABS_API_KEY || process.env.Elevenlabs_api_key || '', item.voiceId);
        const updated = await db.update(workspaceStates).set({ value: JSON.stringify({ ...item, account }), updatedAt: new Date() }).where(and(eq(workspaceStates.userId, row.userId), eq(workspaceStates.stateKey, row.stateKey), eq(workspaceStates.value, row.value))).returning();
        item = updated[0] ? { ...item, account } : await readVoiceState(owner, row.stateKey);
      } catch { continue; }
    }
    if (item?.account === account && item.voiceId) ids.add(item.voiceId);
  }
  return ids;
}
