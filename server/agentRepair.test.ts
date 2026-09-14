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
