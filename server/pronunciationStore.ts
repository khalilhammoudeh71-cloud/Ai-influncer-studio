import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { personas } from '../shared/schema';
import { readVoiceState, writeVoiceState } from './personaVoiceStore';
import { mergePronunciations, pronunciationPair, type PronunciationRule } from '../shared/pronunciation';
export async function pronunciationRules(owner: string, personaId: unknown): Promise<PronunciationRule[]> {
  if (typeof personaId !== 'string' || !personaId) return [];
  const [row] = await db.select({id:personas.id}).from(personas).where(and(eq(personas.clientId,personaId),eq(personas.userId,owner)));
  if (!row) throw new Error('This persona is not available in your account.');
  const [shared,local]=await Promise.all([readVoiceState(owner,'pronunciation-shared'),readVoiceState(owner,`pronunciation:${personaId}`)]);
  return mergePronunciations(shared||[],local||[]);
}
export async function updatePronunciation(owner:string,personaId:string,input:unknown,removeId?:string) {
  return db.transaction(async (tx: any)=>{
    const [row]=await tx.select({id:personas.id}).from(personas).where(and(eq(personas.clientId,personaId),eq(personas.userId,owner))).for('update');
    if(!row)throw new Error('This persona is not available in your account.');
    // Serialize edits across every persona in this account, including first shared write.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`pronunciation:${owner}`}))`);
    const localKey=`pronunciation:${personaId}`,sharedKey='pronunciation-shared';
    let local:PronunciationRule[]=await readVoiceState(owner,localKey,tx)||[];
    let shared:PronunciationRule[]=await readVoiceState(owner,sharedKey,tx)||[];
    const all=removeId?shared.some(r=>r.id===removeId):(input as any)?.scope==='all';
    const key=all?sharedKey:localKey;
    const rules=all?shared:local;
    let next:PronunciationRule[];
    if(removeId)next=rules.filter(r=>r.id!==removeId);
    else {
      const pair=pronunciationPair(input);if(!pair)throw new Error('Enter the word and a distinct pronunciation, up to 160 and 200 characters.');
      const old=rules.find(r=>r.word.toLowerCase()===pair.word.toLowerCase());
      if(!old&&rules.length>=100)throw new Error('This pronunciation list has 100 entries. Remove one before adding another.');
      const rule={...pair,id:old?.id||randomUUID(),source:'explicit-user-correction',updatedAt:new Date().toISOString()};
      next=[rule,...rules.filter(r=>r.id!==rule.id)].slice(0,100);
      if(all){
        // Promoting this persona's rule must not leave an old local override masking it.
        local=local.filter(r=>r.word.toLowerCase()!==pair.word.toLowerCase());
        await writeVoiceState(owner,localKey,local,tx);
      }
    }
    await writeVoiceState(owner,key,next,tx);
    if(all)shared=next;else local=next;
    return mergePronunciations(shared,local);
  });
}
