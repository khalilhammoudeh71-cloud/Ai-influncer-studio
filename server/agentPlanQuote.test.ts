import test from 'node:test';
import assert from 'node:assert/strict';
import { quotePlan } from './agentPlanQuote';
const steps:any[]=[{type:'generate_image',params:{prompt:'cup'}},{type:'edit_image',params:{prompt:'green',sourceImage:'previous_result'}}];
const price:any=async()=>({credits:3,providerCostUsd:.05,quoteSource:'configured-fallback'});
test('video estimate uses the same duration and resolution as execution',async()=>{
 let received:any[]=[];
 await quotePlan([{type:'generate_video',status:'pending',params:{prompt:'Coffee steam',duration:5,resolution:'720p'}}],async(...args:any[])=>{received=args;return price();},50,false);
 assert.deepEqual(received.slice(1),['video',1,{duration:5,resolution:'720p'}]);
});
test('estimates cover image edits and visual checking fees',async()=>{
 const q=await quotePlan(steps,price,10,false);
 assert.equal(q.estimatedCredits,8);assert.equal(q.complete,true);assert.equal(q.steps[1].credits,4);assert.equal(q.insufficientCredits,false);
});
test('creator entitlement is preserved and low balances are reported',async()=>{
 assert.equal((await quotePlan(steps,price,0,false)).insufficientCredits,true);
 const q=await quotePlan(steps,price,0,true);assert.equal(q.estimatedCredits,0);assert.equal(q.insufficientCredits,false);assert.equal(q.providerChargesApply,true);
});
test('server quote exposes provider dollar estimates separately from credit allowance',async()=>{
 const q=await quotePlan(steps,price,10,false);
 assert.equal(q.estimatedProviderCostUsd,.1);assert.equal(q.steps[0].providerCostUsd,.05);
 assert.equal(q.providerCostIsEstimate,true);
});
