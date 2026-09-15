import test from 'node:test';
import assert from 'node:assert/strict';
import {readAgentChatResponse} from './agentChatResponse';

test('known planner failures keep their actionable explanation instead of a generic failure',async()=>{
  await assert.rejects(readAgentChatResponse(new Response(JSON.stringify({error:'selected_model_unavailable',text:'grok-4.6 returned HTTP 429. No alternate model was used.',suggestedSteps:[]}),{status:502})),/grok-4\.6 returned HTTP 429/);
});
test('HTML proxy failures and broken success responses cannot look like completed work',async()=>{
  await assert.rejects(readAgentChatResponse(new Response('<html>Bad gateway</html>',{status:502})),/502/);
  await assert.rejects(readAgentChatResponse(new Response('null')),/usable response/);
});
test('a successful response retains the validated steps',async()=>{
  const data=await readAgentChatResponse(new Response(JSON.stringify({text:'Review this.',suggestedSteps:[{type:'generate_image',params:{prompt:'A blue cup'}}]})));
  assert.equal(data.suggestedSteps.length,1);
});
