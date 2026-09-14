import test from 'node:test';
import assert from 'node:assert/strict';
import { quotePlan } from './agentPlanQuote';
const steps:any[]=[{type:'generate_image',params:{prompt:'cup'}},{type:'edit_image',params:{prompt:'green',sourceImage:'previous_result'}}];
const price:any=async()=>({credits:3,providerCostUsd:.05,quoteSource:'configured-fallback'});
test('estimates cover image edits and visual checking fees',async()=>{
 const q=await quotePlan(steps,price,10,false);
 assert.equal(q.estimatedCredits,8);assert.equal(q.complete,true);assert.equal(q.steps[1].credits,4);assert.equal(q.insufficientCredits,false);
});
test('creator entitlement is preserved and low balances are reported',async()=>{
 assert.equal((await quotePlan(steps,price,0,false)).insufficientCredits,true);
 const q=await quotePlan(steps,price,0,true);assert.equal(q.estimatedCredits,0);assert.equal(q.insufficientCredits,false);assert.equal(q.providerChargesApply,true);
});
