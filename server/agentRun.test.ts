import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRunAction, validateRunSteps } from '../shared/agentRun';
const image = () => ({ type: 'generate_image', params: { prompt: 'A blue teacup' }, status: 'pending' });
test('starts only the first unfinished step and waits for its saved job', () => {
    assert.deepEqual(nextRunAction([image(), image()]), { kind: 'create', index: 0 });
    assert.deepEqual(nextRunAction([{ ...image(), jobId: 'one' }], { status: 'running' }), { kind: 'wait', index: 0 });
});
test('recovers a finished child without regenerating it', () => {
    assert.deepEqual(nextRunAction([{ ...image(), jobId: 'one' }, image()], { status: 'succeeded', result: { url: 'https://example.com/a.jpg' } }), { kind: 'success', index: 0, url: 'https://example.com/a.jpg' });
    assert.deepEqual(nextRunAction([{ ...image(), status: 'success' }, image()]), { kind: 'create', index: 1 });
});
test('failed and missing children stop the plan instead of silently charging a retry', () => {
    assert.equal(nextRunAction([{ ...image(), jobId: 'one' }], { status: 'failed', error: 'Timeout' }).kind, 'fail');
    assert.equal(nextRunAction([{ ...image(), jobId: 'one' }]).kind, 'fail');
    assert.equal(nextRunAction([{ ...image(), jobId: 'one' }], { status: 'succeeded', result: {} }).kind, 'fail');
});
test('rejects unsupported actions, empty prompts, and forward dependencies before approval is stored', () => {
    assert.throws(() => validateRunSteps([{ type: 'publish', params: {} }]));
    assert.throws(() => validateRunSteps([{ ...image(), params: { prompt: '' } }]));
    assert.throws(() => validateRunSteps([{ ...image(), params: { prompt: 'x', sourceImageFromStepIndex: 1 } }, image()]));
    assert.throws(() => validateRunSteps([]));
});
test('does not trust client-supplied results or child IDs', () => {
    const [s] = validateRunSteps([{ ...image(), status: 'success', jobId: 'foreign', resultUrl: 'https://fake' }]);
    assert.equal(s.status, 'pending');
    assert.equal(s.jobId, undefined);
    assert.equal(s.resultUrl, undefined);
});
test('an edit returning its source cannot advance the plan', () => {
    assert.equal(nextRunAction([{ type: 'edit_image', params: { prompt: 'Make it green' }, status: 'running', jobId: 'edit' }], { status: 'succeeded', request: { sourceImage: 'https://example.com/original.jpg' }, result: { url: 'https://example.com/original.jpg' } }).kind, 'fail');
});
test('source-based image plans use the edit path instead of discarding the source',()=>{
 assert.equal(validateRunSteps([{type:'generate_image',params:{prompt:'Make the cup blue',sourceImage:'previous_result'}}])[0].type,'edit_image');
});
