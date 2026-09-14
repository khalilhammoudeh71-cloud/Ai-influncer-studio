import { and, eq, sql } from 'drizzle-orm';
import { agentRuns } from '../shared/schema';
// Caller owns the transaction so account billing and task allowance commit together.
// Failed/ambiguous provider attempts retain allowance even if account credits refund.
export async function reserveRunAllowance(tx:any,runId:string,userId:string,credits:number):Promise<void>{
 if(!Number.isSafeInteger(credits)||credits<1)throw new Error('Invalid task usage amount.');
 const rows=await tx.update(agentRuns).set({usedCredits:sql`${agentRuns.usedCredits} + ${credits}`}).where(and(eq(agentRuns.id,runId),eq(agentRuns.userId,userId),sql`${agentRuns.budgetCredits} IS NOT NULL AND ${agentRuns.usedCredits} + ${credits} <= ${agentRuns.budgetCredits}`)).returning({id:agentRuns.id});
 if(!rows.length)throw new Error('Task allowance reached or not configured. Increase the limit before retrying. No new provider call was started.');
}
