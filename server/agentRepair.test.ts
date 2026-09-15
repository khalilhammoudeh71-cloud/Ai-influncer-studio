import test from 'node:test';
import assert from 'node:assert/strict';
import { proposeAgentRepair, type RepairContext } from './agentRepair';

const context: RepairContext = {
  error: 'The source image was returned unchanged', hasSourceImage: false,
  steps: [
    { type: 'generate_image', params: { prompt: 'A blue cup on a wooden table, no people' }, status: 'success', resultUrl: 'https://private.example/result?token=secret' },
    { type: 'edit_image', params: { prompt: 'Make the cup green', sourceImageFromStepIndex: 0 }, status: 'error' },
  ],
};
const reply = (value: any) => async () => ({ text: JSON.stringify(value), model: 'test-model', provider: 'test' });

test('repair diagnoses the failed step with completed task context but excludes image URLs and credentials', async () => {
  const original = structuredClone(context);
  const result = await proposeAgentRepair({ ...context, error: `${context.error} https://private.example?key=secret Bearer secret-token` }, 'frontier-gemini-flash', async (model, messages) => {
    assert.equal(model, 'frontier-gemini-flash');
    const evidence = JSON.parse(messages[0].content);
    assert.equal(evidence.failedStep.number, 2);
    assert.equal(evidence.failedStep.hasSourceImage, true);
    assert.equal(evidence.completedSteps[0].prompt, 'A blue cup on a wooden table, no people');
    assert.ok(!JSON.stringify(evidence).includes('secret'));
    return { text: '```json\n{"action":"revise","reason":"Specify the color change and preserve the scene.","proposedPrompt":"Change only the blue cup to green; keep the table and camera angle."}\n```', model: 'test-model', provider: 'test' };
  });
  assert.equal(result.proposedPrompt, 'Change only the blue cup to green; keep the table and camera angle.');
  assert.equal(result.model, 'test-model');
  assert.deepEqual(context, original);
});

test('billing, access, policy, missing source and transient errors do not spend model calls on prompt rewrites', async () => {
  const never = async (): Promise<any> => { throw new Error('Must not invoke model'); };
  for (const error of ['Insufficient credits', 'Unauthorized API key', 'Content flagged as potentially sensitive']) {
    const result = await proposeAgentRepair({ ...context, error }, 'frontier-gemini-flash', never);
    assert.equal(result.action, 'review');
    assert.equal(result.proposedPrompt, null);
  }
  const missing = await proposeAgentRepair({ ...context, steps: [context.steps[1]] }, 'frontier-gemini-flash', never);
  assert.equal(missing.action, 'review');
  const transient = await proposeAgentRepair({ ...context, error: 'HTTP 504 timeout' }, 'frontier-gemini-flash', never);
  assert.equal(transient.action, 'retry');
  assert.equal(transient.proposedPrompt, 'Make the cup green');
});

test('model output cannot smuggle a new model, source, tool, or unchanged repair through the proposal contract', async () => {
  for (const output of [
    { action: 'revise', reason: 'Fix', proposedPrompt: 'Green cup', modelId: 'unapproved' },
    { action: 'revise', reason: 'Fix', proposedPrompt: 'Make the cup green' },
    { action: 'revise', reason: 'Fix', proposedPrompt: '' },
    { action: 'review', reason: 'Need user input', proposedPrompt: 'Generate a different image' },
    { action: 'retry', reason: 'Retry', proposedPrompt: 'Different image' },
    { action: 'revise', reason: 'Fix', proposedPrompt: 'x'.repeat(20001) },
  ]) await assert.rejects(proposeAgentRepair(context, 'frontier-grok', reply(output)));
  await assert.rejects(proposeAgentRepair(context, 'constructor', reply({})), /available repair model/);
  await assert.rejects(proposeAgentRepair(context, 'frontier-grok', async () => ({ text: 'not json', model: 'test', provider: 'test' })), /unreadable/);
  await assert.rejects(proposeAgentRepair(context, 'frontier-grok', async () => ({ text: 'x'.repeat(30001), model: 'test', provider: 'test' })), /unreadable/);
});

test('uncertain diagnosis requests review instead of returning an executable retry', async () => {
  const result = await proposeAgentRepair({ ...context, error: 'Unknown provider error' }, 'frontier-grok', reply({ action: 'retry', reason: 'Unclear cause', proposedPrompt: 'Make the cup green' }));
  assert.equal(result.action, 'review');
  assert.equal(result.proposedPrompt, null);
  await assert.rejects(proposeAgentRepair(context, 'frontier-grok', async () => { throw new Error('HTTP 503'); }), /503/);
});

test('remaining-plan repair includes later instructions but cannot alter completed steps or dependencies',async()=>{
 const expanded={...context,scope:'remaining' as const,steps:[...context.steps,{type:'generate_video',status:'pending',params:{prompt:'Pan around the green cup',sourceImageFromStepIndex:1}}]};
 const result=await proposeAgentRepair(expanded,'frontier-grok',async(_model,messages)=>{const evidence=JSON.parse(messages[0].content);assert.equal(evidence.remainingSteps[1].prompt,'Pan around the green cup');return{text:JSON.stringify({action:'revise',reason:'Carry the green cup into the video.',proposedPrompt:'Change only the cup color to green.',remainingPrompts:[{index:1,prompt:'Change only the cup color to green.'},{index:2,prompt:'Pan slowly around the resulting green cup; retain the table.'}]}),model:'test',provider:'test'};});
 assert.equal(result.remainingPrompts?.length,2);
 await assert.rejects(proposeAgentRepair(expanded,'frontier-grok',reply({action:'revise',reason:'Invalid',proposedPrompt:'Change only the cup color to green.',remainingPrompts:[{index:0,prompt:'Overwrite completed image'},{index:2,prompt:'Video'}]})));
});

test('analysis allowance is reserved only when an actual model call is needed, and blocks the call when exhausted',async()=>{
 let reservations=0,calls=0;
 const withModelCall=async(work:()=>Promise<any>)=>{reservations++;throw new Error('Task allowance reached');};
 const invoke=async()=>{calls++;return {text:'{}',model:'test',provider:'test'};};
 await proposeAgentRepair({...context,error:'Insufficient credits',withModelCall},'frontier-grok',invoke);
 await proposeAgentRepair({...context,error:'Task allowance reached',withModelCall},'frontier-grok',invoke);
 await proposeAgentRepair({...context,steps:[context.steps[1]],withModelCall},'frontier-grok',invoke);
 assert.equal(reservations,0);assert.equal(calls,0);
 await assert.rejects(proposeAgentRepair({...context,withModelCall},'frontier-grok',invoke),/Task allowance reached/);
 assert.equal(reservations,1);assert.equal(calls,0);
});
