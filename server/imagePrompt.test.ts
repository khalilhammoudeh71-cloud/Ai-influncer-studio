import test from 'node:test';import assert from 'node:assert/strict';
process.env.VERCEL='1';process.env.NODE_ENV='test';
const {buildPrompt}=await import('./index');
test('explicit studio and scene-preparation prompts retain the requested scene without a chat flag',()=>{
 const scene='An adult woman in a navy blazer standing in a garden, side profile view.';
 const prompt=buildPrompt({personaName:'Demo',prompt:scene,preservePromptVerbatim:true,referenceImage:'reference',identityLock:true,naturalLook:true} as any);
 assert.ok(prompt.includes(scene));assert.match(prompt,/navy blazer/);assert.match(prompt,/garden/);assert.match(prompt,/side profile/);
});
test('initial persona appearance generation retains its description without existing references',()=>{
 const prompt=buildPrompt({prompt:'An adult fictional character with short red hair, freckles and green eyes.'} as any);
 assert.match(prompt,/short red hair/);assert.match(prompt,/freckles/);
});
