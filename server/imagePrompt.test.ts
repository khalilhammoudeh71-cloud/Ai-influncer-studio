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
test('reference identity instructions allow requested expression changes in guided and direct generation',()=>{
 for(const request of [{additionalInstructions:'Laughing openly with visible teeth and narrowed eyes.'},{prompt:'Laughing openly with visible teeth and narrowed eyes.',preservePromptVerbatim:true}]){
  const prompt=buildPrompt({personaName:'Demo',referenceImage:'reference',identityLock:true,faceDescriptor:'Long dark hair, a gentle smile.',...request} as any);
  assert.match(prompt,/Laughing openly with visible teeth and narrowed eyes\./);
  assert.match(prompt,/expression is not identity/i);
  assert.ok(prompt.lastIndexOf('EXPRESSION FREEDOM:')>prompt.lastIndexOf('gentle smile'),'expression request must take priority over stale appearance descriptions');
 }
});
test('free generation does not invent an identity reference policy',()=>{
 const prompt=buildPrompt({prompt:'A smiling fictional character in a garden',identityLock:false} as any);
 assert.doesNotMatch(prompt,/EXPRESSION FREEDOM:/);
});
