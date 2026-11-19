import test from 'node:test';
import assert from 'node:assert/strict';
import { needsCreativeReview, reviewCreativeDraft, validateCreativePlan } from './agentCreativeReview';
const ideas = Array.from({ length: 8 }, (_, i) => ({ title: `Idea ${i}`, opening: `Visible hook ${i}`, payoff: `Distinct payoff ${i}`, shareReason: 'Parents would send this to a partner.' }));
const context = { kind: 'ideas' as const, request: 'Fitness for parents', creatorProfile: { limits: 'Film alone' }, feedback: 'Passed: Too generic', history: [] };
const draft = { text: JSON.stringify({ ideas, pick: 6, reason: 'Clear opening.' }), suggestedSteps: [] };
const steps = [{ type: 'generate_image', params: { prompt: 'A trainer at a gym', aspectRatio: '9:16' } }, { type: 'generate_video', params: { prompt: 'The trainer waves', sourceImageFromStepIndex: 0 } }];

test('a candidate pool is rewritten into four finalists using creator context', async () => {
  let calls = 0;
  const result = await reviewCreativeDraft(draft, context, async prompt => {
    calls++;
    assert.match(prompt, /Film alone/);
    assert.match(prompt, /Too generic/);
    assert.match(prompt, /Fitness for parents/);
    assert.match(prompt, /exactly FOUR/);
    return { text: JSON.stringify({ ideas: ideas.slice(2, 6), pick: 2, reason: 'The hook is visible immediately.' }), suggestedSteps: [{ type: 'log_revenue' }] };
  });
  assert.equal(calls, 1);
  assert.equal(JSON.parse(result.text).ideas.length, 4);
  assert.equal(JSON.parse(result.text).ideas[0].title, 'Idea 2');
  assert.equal(result.creativeReview.status, 'reviewed');
  assert.deepEqual(result.suggestedSteps, []);
});

test('a failed or malformed review keeps usable original candidates and its strongest pick', async () => {
  for (const review of [async () => { throw new Error('Unavailable'); }, async () => ({ text: draft.text })]) {
    const result = await reviewCreativeDraft(draft, context, review);
    assert.equal(result.creativeReview.status, 'unavailable');
    assert.equal(JSON.parse(result.text).ideas.length, 4);
    assert.equal(JSON.parse(result.text).ideas[0].title, 'Idea 6');
  }
  await assert.rejects(() => reviewCreativeDraft({ text: 'invalid' }, context, async () => { throw new Error(); }), /Neither draft nor review/);
});

test('a production rewrite preserves planner metadata and returns reviewable steps only', async () => {
  const result = await reviewCreativeDraft({ text: 'Original', suggestedSteps: steps, agentMode: { model: 'chosen' }, sources: [{ url: 'https://example.com' }] }, { ...context, kind: 'production' }, async () => ({ text: '0–2s: trainer waves. Dialogue: Hello. Captions: Hello.', suggestedSteps: steps, status: 'executing' }));
  assert.equal(result.status, 'clarifying');
  assert.equal(result.agentMode.model, 'chosen');
  assert.equal(result.sources.length, 1);
  assert.match(result.text, /Dialogue/);
});

test('invalid dependencies, unsupported actions and unrelated revenue cannot enter a revised plan', async () => {
  for (const bad of [
    [{ type: 'generate_video', params: { prompt: 'Wave', sourceImageFromStepIndex: 1 } }],
    [{ type: 'generate_voice', params: { text: 'Hi' } }, { type: 'generate_video', params: { prompt: 'Wave', sourceImageFromStepIndex: 0 } }],
    [{ type: 'stitch_video', params: { segmentIndices: [0] } }],
    [{ type: 'log_revenue', params: { amount: 1000 } }],
  ]) {
    assert.throws(() => validateCreativePlan({ suggestedSteps: bad }, context.request));
    const result = await reviewCreativeDraft({ text: 'Original', suggestedSteps: steps }, { ...context, kind: 'production' }, async () => ({ text: 'Invalid', suggestedSteps: bad }));
    assert.equal(result.creativeReview.status, 'unavailable');
    assert.equal(result.text, 'Original');
  }
});

test('cancellation never returns a fallback and casual chat never gets an extra review', async () => {
  const controller = new AbortController();
  await assert.rejects(() => reviewCreativeDraft(draft, context, async () => { controller.abort(); throw new Error(); }, controller.signal), /abort/i);
  assert.equal(needsCreativeReview({ text: 'Hello' }, false, false), false);
  assert.equal(needsCreativeReview({ suggestedSteps: [steps[0]] }, false, false), false);
  assert.equal(needsCreativeReview({ suggestedSteps: steps }, false, false), true);
  assert.equal(needsCreativeReview({ campaign: {} }, false, false), false);
});


test('a phone-only reel can be reviewed without inventing paid media steps', async () => {
  const result = await reviewCreativeDraft({ text: 'Film on your phone', suggestedSteps: [] }, { ...context, kind: 'production' }, async () => ({ text: '0–2 seconds: show the result. Then demonstrate it. Record on your phone.', suggestedSteps: [] }));
  assert.equal(result.creativeReview.status, 'reviewed');
  assert.deepEqual(result.suggestedSteps, []);
  assert.equal(result.status, 'normal');
});

test('a rewrite cannot discard the existing model, framing or duration', async () => {
  const original = { text: 'Keep my model', suggestedSteps: [{ type: 'generate_video', params: { prompt: 'A trainer waves', modelId: 'user-selected-model', duration: 8, aspectRatio: '9:16' } }] };
  const result = await reviewCreativeDraft(original, { ...context, kind: 'production' }, async () => ({ text: 'Changed it', suggestedSteps: [{ type: 'generate_video', params: { prompt: 'A trainer waves', duration: 4, aspectRatio: '1:1' } }] }));
  assert.equal(result.creativeReview.status, 'unavailable');
  assert.equal(result.text, original.text);
  assert.equal(result.suggestedSteps[0].params.duration, 8);
});
