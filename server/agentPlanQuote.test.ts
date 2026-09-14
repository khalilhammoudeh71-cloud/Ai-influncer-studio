import test from 'node:test';
import assert from 'node:assert/strict';
import { quotePlan } from './agentPlanQuote';
const steps:any[]=[{type:'generate_image',params:{prompt:'cup'}},{type:'edit_image',params:{prompt:'green',sourceImage:'previous_result'}}];
const price:any=async()=>({credits:3,providerCostUsd:.05,quoteSource:'configured-fallback'});
test('partial estimates never claim a complete plan price',async()=>{
 const q=await quotePlan(steps,price,10,false);
 assert.equal(q.estimatedCredits,3);assert.equal(q.complete,false);assert.equal(q.steps[1].credits,null);assert.equal(q.insufficientCredits,false);
});
test('creator entitlement is preserved and low balances are reported',async()=>{
 assert.equal((await quotePlan(steps,price,0,false)).insufficientCredits,true);
 const q=await quotePlan(steps,price,0,true);assert.equal(q.estimatedCredits,0);assert.equal(q.insufficientCredits,false);assert.equal(q.providerChargesApply,true);
});
