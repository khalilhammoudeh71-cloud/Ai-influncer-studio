import test from 'node:test';
import assert from 'node:assert/strict';
import { productionStepsForExecution, setProductionPreset, suggestProductionPresets } from './agentProductionPresets';

test('suggests presets for persona shots, preserving explicit framing and leaving object shots alone', () => {
  const steps = suggestProductionPresets([
    { type: 'generate_image', params: { prompt: 'Dr. H in a dental operatory wearing wine scrubs', usePersona: true } },
    { type: 'generate_image', params: { prompt: 'Talking head of Dr. H', aspectRatio: '4:5' } },
    { type: 'generate_image', params: { prompt: 'Empty dental operatory', usePersona: false } },
  ]);
  const [clinical, talking, object] = productionStepsForExecution(steps);
  assert.match(clinical.params.prompt, /^Dr. H in a dental operatory wearing wine scrubs/);
  assert.match(clinical.params.prompt, /explicit shot instructions above take priority/);
  assert.equal(clinical.params.aspectRatio, '9:16');
  assert.match(talking.params.prompt, /loupes around his neck/);
  assert.equal(talking.params.aspectRatio, '4:5');
  assert.deepEqual(object.params, { prompt: 'Empty dental operatory', usePersona: false });
});

test('removing a preset preserves the base shot and a speaking step uses the selected voice', () => {
  const original = { type: 'generate_image', params: { prompt: 'A shot', aspectRatio: '1:1' } };
  assert.deepEqual(setProductionPreset(setProductionPreset(original, 'clinical'), ''), original);
  const step = setProductionPreset({ type: 'generate_talking_head', params: { text: 'Hello', sourceImageFromStepIndex: 1 } }, 'talking');
  assert.deepEqual(productionStepsForExecution([step], 'saved-voice')[0].params, {
    text: 'Hello', sourceImageFromStepIndex: 1, voiceId: 'saved-voice',
  });
});

test('custom presets are suggested from the current project without changing persona selection', () => {
  const presets = [{id:'product-demo',name:'Product demo',rules:'Use a clean tabletop and hands only.',aspectRatio:'4:5'}];
  const [unmatched, matched] = suggestProductionPresets([
    { type: 'generate_image', params: { prompt: 'A dental operatory' } },
    { type: 'generate_image', params: { prompt: 'A product on the desk', usePersona: false, productionPresetHint: 'product-demo' } },
  ], presets);
  assert.equal(Reflect.get(unmatched.params, 'productionPreset'), undefined);
  const [ready] = productionStepsForExecution([matched]);
  assert.equal(ready.params.usePersona, false);
  assert.equal(Reflect.get(ready.params, 'aspectRatio'), '4:5');
  assert.match(ready.params.prompt, /clean tabletop/);
});
