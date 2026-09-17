import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewCampaignDraft, stripUnverifiedPrices } from './agentDraftReview';
const steps:any=[{type:'generate_image',params:{prompt:'Coffee concept',usePersona:false}}];
const campaign:any={title:'Coffee',platform:'Instagram',posts:[{date:'2025-05-01',title:'Launch',caption:'Small-batch roast at our downtown address.',format:'image',assets:[{stepIndex:0,alt:'Coffee'}]}]};
const repaired={text:'Review this fictional concept.',suggestedSteps:steps,campaign:{...campaign,posts:[{...campaign.posts[0],date:'2026-09-18',caption:'A fictional coffee concept.'}]}};
test('campaign review repairs dates and claims using original brief and trusted date',async()=>{
 let input:any;
 const result=await reviewCampaignDraft({text:'Saved',suggestedSteps:steps,campaign}, {request:'Create a fictional campaign with no invented facts',history:[],today:'2026-09-17'},async context=>{input=context;return repaired;});
 assert.equal(result.campaign.posts[0].date,'2026-09-18');assert.match(input,/2026-09-17/);assert.match(input,/no invented facts/);assert.match(result.campaign.posts[0].caption,/fictional/);
});
test('missing structured campaign revision is reviewed and recovered, not falsely saved',async()=>{
 const result=await reviewCampaignDraft({text:'Saved revised campaign',suggestedSteps:[]},{request:'Revise the campaign dates',history:[],today:'2026-09-17',previousDraft:{campaign,suggestedSteps:steps}},async()=>repaired);
 assert.equal(result.suggestedSteps.length,1);assert.ok(result.campaign);
});
test('invalid reviewer output fails closed while caller can preserve prior draft',async()=>{
 await assert.rejects(()=>reviewCampaignDraft({text:'Saved',campaign,suggestedSteps:steps},{request:'Create a campaign',history:[],today:'2026-09-17'},async()=>({text:'Saved',suggestedSteps:[]})),/structured|campaign/i);
 await assert.rejects(()=>reviewCampaignDraft({text:'Saved',campaign,suggestedSteps:steps},{request:'Create a campaign',history:[],today:'2026-09-17'},async()=>({text:'Saved',campaign,suggestedSteps:steps})),/past/i);
});
test('explicit historical date requests stay supported and ordinary conversation needs no review',async()=>{
 const result=await reviewCampaignDraft({text:'Historical concept',campaign,suggestedSteps:steps},{request:'Reconstruct a campaign for May 1, 2025',history:[],today:'2026-09-17'},async()=>({text:'Historical concept',campaign,suggestedSteps:steps}));assert.ok(result.campaign);
 let called=false;await reviewCampaignDraft({text:'Hello',suggestedSteps:[]},{request:'Hello',history:[],today:'2026-09-17'},async()=>{called=true;return repaired;});assert.equal(called,false);
});
test('model-written monetary estimates are omitted, user budgets remain',()=>{
 assert.doesNotMatch(stripUnverifiedPrices('Estimated generation cost: $0.07\nBudget limit: $3\nTwo images.'),/0\.07/);assert.match(stripUnverifiedPrices('Budget limit: $3'),/\$3/);
});
