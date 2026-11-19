import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareFirstShotRevision } from './firstShotRevision';
import { nextRunAction, type RunStep } from '../shared/agentRun';

const original: RunStep = {
    type: 'generate_image', params: { prompt: 'A dentist in navy scrubs', modelId: 'openai:gpt-image-2.6-sunburst' },
    jobId: 'original', resultUrl: 'https://example.com/original.png', status: 'success', reviewBeforeContinuing: true,
};

test('revision edits the selected saved take and keeps the existing route', () => {
    const previous = { jobId: 'previous', url: 'https://example.com/previous.png' };
    const result = prepareFirstShotRevision([{ ...original, firstShotTakes: [previous, { jobId: 'original', url: original.resultUrl! }] }],
        { baseJobId: 'previous', feedback: 'Move the loupes around his neck' });
    assert.equal(result.revision.sourceUrl, previous.url);
    assert.match(result.revision.prompt, /Move the loupes around his neck/);
    assert.equal(result.quoteStep.type, 'edit_image');
    assert.equal(result.quoteStep.params.modelId, original.params.modelId);
    assert.equal(result.takes.length, 2);
    assert.throws(() => prepareFirstShotRevision([original], { baseJobId: 'unowned', feedback: 'Change wardrobe' }), /saved take/);
    assert.throws(() => prepareFirstShotRevision([{ ...original, reviewBeforeContinuing: false }],
        { baseJobId: 'original', feedback: 'Change wardrobe' }), /Wait for/);
});

test('a Seedream image revision is quoted using the edit route and rejects an unchanged result', () => {
    const step = { ...original, params: { ...original.params, modelId: 'wavespeed:bytedance/seedream-v5.0-pro' } };
    const result = prepareFirstShotRevision([step], { baseJobId: 'original', feedback: 'Change the light' });
    assert.equal(result.quoteStep.params.modelId, 'wavespeed-edit:bytedance/seedream-v5.0-pro/edit');
    assert.equal(nextRunAction([{ ...step, status: 'running', firstShotRevision: result.revision }], {
        status: 'succeeded', request: { sourceImage: result.revision.sourceUrl }, result: { url: result.revision.sourceUrl },
    }).kind, 'fail');
});
