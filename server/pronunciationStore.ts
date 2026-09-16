import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { personas } from '../shared/schema';
import { readVoiceState, writeVoiceState } from './personaVoiceStore';
import { pronunciationPair, type PronunciationRule } from '../shared/pronunciation';
export async function pronunciationRules(owner: string, personaId: unknown): Promise<PronunciationRule[]> {
  if (typeof personaId !== 'string' || !personaId) return [];
  const [row] = await db.select({id:personas.id}).from(personas).where(and(eq(personas.clientId,personaId),eq(personas.userId,owner)));
  if (!row) throw new Error('This persona is not available in your account.');
  return await readVoiceState(owner, `pronunciation:${personaId}`) || [];
}
export async function updatePronunciation(owner:string,personaId:string,input:unknown,removeId?:string) {
  return db.transaction(async (tx: any)=>{
    const [row]=await tx.select({id:personas.id}).from(personas).where(and(eq(personas.clientId,personaId),eq(personas.userId,owner))).for('update');
    if(!row)throw new Error('This persona is not available in your account.');
    const key=`pronunciation:${personaId}`;
    const rules:PronunciationRule[]=await readVoiceState(owner,key,tx)||[];
    let next:PronunciationRule[];
    if(removeId)next=rules.filter(r=>r.id!==removeId);
    else {
      const pair=pronunciationPair(input);if(!pair)throw new Error('Enter the word and a distinct pronunciation, up to 160 and 200 characters.');
      const old=rules.find(r=>r.word.toLowerCase()===pair.word.toLowerCase());
      if(!old&&rules.length>=100)throw new Error('This persona has 100 saved pronunciations. Remove one before adding another.');
      const rule={...pair,id:old?.id||randomUUID(),source:'explicit-user-correction',updatedAt:new Date().toISOString()};
      next=[rule,...rules.filter(r=>r.id!==rule.id)].slice(0,100);
    }
    await writeVoiceState(owner,key,next,tx);return next;
  });
}
