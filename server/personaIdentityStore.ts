import {and,eq} from 'drizzle-orm';
import {db} from './db';
import {workspaceStates} from '../shared/schema';
import type {IdentityReference} from '../shared/personaIdentitySet';
// Server-owned metadata uses the same transactional workspace store as personas.
const ownerKey=(owner:string)=>`persona-identity:${owner}`;
export async function readIdentitySet(owner:string,id:string,connection=db):Promise<IdentityReference[]|undefined> {
 const [row]=await connection.select().from(workspaceStates).where(and(eq(workspaceStates.userId,ownerKey(owner)),eq(workspaceStates.stateKey,id)));
 if(!row)return undefined;
 const value=JSON.parse(row.value);
 if(!Array.isArray(value))throw new Error('The saved identity reference set is unreadable.');
 return value;
}
export async function writeIdentitySet(owner:string,id:string,refs:IdentityReference[]|undefined,connection=db) {
 if(refs===undefined)return;
 const value=JSON.stringify(refs);const updatedAt=new Date();
 await connection.insert(workspaceStates).values({userId:ownerKey(owner),stateKey:id,value,updatedAt}).onConflictDoUpdate({target:[workspaceStates.userId,workspaceStates.stateKey],set:{value,updatedAt}});
}

export async function deleteIdentitySet(owner:string,id:string,connection=db) {
 await connection.delete(workspaceStates).where(and(eq(workspaceStates.userId,ownerKey(owner)),eq(workspaceStates.stateKey,id)));
}
