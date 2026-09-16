import test from 'node:test';import assert from 'node:assert/strict';import {writingInstructions,verifyResearchLinks,campaignIdeaInstructions} from './agentWriting';
test('writing guidance loads only for writing requests and retains evidence/style boundaries',()=>{
 assert.equal(writingInstructions('Hello'), '');assert.match(writingInstructions('Draft a newsletter'),/selected persona/);assert.match(writingInstructions('Revise this script'),/never invent quotes/);
});
test('unretrieved links are never labeled verified and matching URLs do not prove claim support',()=>{
 assert.equal(verifyResearchLinks('Claim [source](https://example.org/a)',[{url:'https://example.org/a'}]).status,'links-match-retrieval');
 assert.equal(verifyResearchLinks('https://invented.example/a',[]).unverifiedLinkCount,1);
 assert.equal(verifyResearchLinks('No sources',[]).status,'no-retrieved-sources');
 assert.equal(verifyResearchLinks('https://example.org/a',[{url:'https://example.org/a'}]).claimSupport,'not-evaluated');
});

import {blocksAgentPlan} from '../shared/agentPlanIntent';
test('campaign ideation stays separate from approved production and does not load on simple chat',()=>{
 assert.equal(campaignIdeaInstructions('Hello'),'');assert.match(campaignIdeaInstructions('Three campaign ideas'),/genuinely different mechanisms/);
 assert.equal(blocksAgentPlan('Campaign ideas only'),true);assert.equal(blocksAgentPlan('Prepare a campaign plan for review'),false);
});
