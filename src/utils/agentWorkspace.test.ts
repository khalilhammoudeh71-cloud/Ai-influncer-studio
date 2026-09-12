import assert from 'node:assert/strict';
import test from 'node:test';
import * as workspace from './agentWorkspace';

test('review mode holds new plans, and explicit text-only requests never execute automatically', () => {
  assert.equal(workspace.canAutoRun(false, 'Create a teacup image'), false);
  assert.equal(workspace.canAutoRun(true, 'Text only; do not create assets or publish. Budget three photos.'), false);
  assert.equal(workspace.canAutoRun(true, 'Create one teacup image'), true);
});

test('restoring a conversation retains results but never restarts an interrupted paid job', () => {
  const restored = workspace.restoreConversation(JSON.stringify([{id:'a',role:'model',content:'A plan',isExecuting:true,status:'executing',execSteps:[{type:'generate_image',params:{prompt:'teacup'},status:'running'}]}]));
  assert.equal(restored[0].isExecuting, false);
  assert.equal(restored[0].execSteps[0].status, 'error');
  assert.match(restored[0].execLogs.join(' '), /interrupted/i);
});

test('invalid persisted data is harmless', () => {
  assert.deepEqual(workspace.restoreConversation('{bad'), []);
  assert.deepEqual(workspace.restoreConversation('{}'), []);
});

test('missing provider outputs cannot be reported as success', () => {
  assert.throws(() => workspace.requireOutput(undefined, 'Voice'), /Voice/);
  assert.throws(() => workspace.requireOutput('', 'Image'), /Image/);
  assert.equal(workspace.requireOutput('https://example.com/result.png', 'Image'), 'https://example.com/result.png');
});

test('a revision uses the newest successful image, not an older portrait or a video', () => {
  assert.equal(workspace.previousImage([
    {execSteps:[{type:'generate_image',status:'success',resultUrl:'old'}]},
    {execSteps:[{type:'edit_image',status:'success',resultUrl:'new'}, {type:'generate_video',status:'success',resultUrl:'video'}]},
  ]), 'new');
});

test('image identity is optional and never mutates the stored persona', () => {
  const person = {id:'rawan',name:'Rawan',avatar:'original',referenceImage:'reference',faceDescriptor:'face'};
  const neutral = workspace.imagePersona(person, {usePersona:false,prompt:'teacup, no people'});
  assert.equal(neutral.referenceImage, undefined);
  assert.equal(neutral.avatar, '');
  assert.equal(person.referenceImage, 'reference');
  assert.equal(workspace.imagePersona(person,{usePersona:true}).referenceImage, 'reference');
});

test('pending plans are not sent to the model as completed task results', async () => {
  const { taskContext } = await import('./agentWorkspace');
  const state = taskContext([{type:'generate_image',status:'pending',params:{prompt:'blue cup'}},{type:'generate_image',status:'success',resultUrl:'data:image/png;base64,abc',params:{prompt:'mint cup'}}]);
  assert.equal(state.pending.length, 1);
  assert.equal(state.results.length, 1);
  assert.equal(state.results[0].resultUrl, 'previous_result');
});
