import test from 'node:test';
import assert from 'node:assert/strict';
import { identityTrialMetrics } from './identityTrialMetrics';
test('human uncertainty and automatic failures remain different measures',()=>{
 const rows:any=[{id:'a',kind:'image',status:'succeeded',createdAt:'2026-11-05T00:00:00Z',startedAt:'2026-11-05T00:00:10Z',completedAt:'2026-11-05T00:00:40Z'}, {id:'b',kind:'video',status:'failed',error:'Persona identity could not be verified'}];
 const result=identityTrialMetrics(rows,{a:{verdict:'uncertain',source:'human',at:'2026-11-05T00:01:00Z'}},[{actualProviderCostMicrousd:null,estimatedProviderCostMicrousd:50000}]);
 assert.equal(result.feedback.uncertain,1);assert.equal(result.identityBlocks,1);assert.equal(result.confirmedFalseRejections,null);
 assert.equal(result.medianExecutionSeconds,30);assert.equal(result.medianQueueSeconds,10);
 assert.equal(result.costs.recordedActualUsd,0);assert.equal(result.costs.actualMissing,1);assert.equal(result.costs.estimatedUsd,0.05);
});
test('feedback for unrelated jobs cannot inflate trial approval counts',()=>{
 const r=identityTrialMetrics([],{outside:{verdict:'same',source:'human',at:'2026-11-05T00:01:00Z'}},[]);
 assert.equal(r.feedback.same,0);assert.equal(r.completed,0);assert.equal(r.medianExecutionSeconds,null);
});
