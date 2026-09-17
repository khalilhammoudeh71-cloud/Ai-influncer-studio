import test from 'node:test';import assert from 'node:assert/strict';import { visibleAgentExchange } from './agentExchange';
test('a failed revision keeps the prior actionable draft visible without exposing older conversations',()=>{
 const messages=[{id:'old',role:'model',content:'old conversation'},{id:'brief',role:'user'},{id:'draft',role:'model',campaign:{title:'Coffee'}},{id:'revision',role:'user'},{id:'failed',role:'model',planningFailed:true}];
 assert.deepEqual(visibleAgentExchange(messages).map(m=>m.id),['draft','revision','failed']);
 assert.deepEqual(visibleAgentExchange([...messages,{id:'retry',role:'user'}]).map(m=>m.id),['retry']);
});
import { reuseCampaignAssets } from './agentExchange';
test('copy-only campaign revision reuses completed approved media without paying again',()=>{
 const previous:any=[{type:'generate_image',status:'success',resultUrl:'https://example.com/cup.png',params:{prompt:'Original cup'},quality:{status:'passed'}}];
 const revised:any=[{type:'generate_image',params:{prompt:'Reworded cup'}}];
 assert.deepEqual(reuseCampaignAssets(revised,previous,'Revise captions. Do not regenerate images.'),previous);
 assert.equal(reuseCampaignAssets(revised,previous,'Generate a new cup image'),undefined);
 assert.equal(reuseCampaignAssets([...revised,...revised],previous,'Do not regenerate images'),undefined);
});
