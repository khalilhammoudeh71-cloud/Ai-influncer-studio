import test from 'node:test';import assert from 'node:assert/strict';
import {validateSequence,SEQUENCE_STYLES} from './carouselSequence';
import {normalizeSlideDesign,packCarouselImages,unpackCarouselImages} from './carousel';
test('sequence options cover only following slides and retain editable prompts',()=>{
 const slides=Array.from({length:4},()=>({options:[{title:'Closer view',prompt:'A close-up preserving the cover identity.'},{title:'Wider view',prompt:'A wider view in the same setting.'}]}));
 const result=validateSequence({slides},5);assert.deepEqual(result.map(s=>s.slide),[1,2,3,4]);assert.equal(result[0].options[1].prompt,slides[0].options[1].prompt);assert.ok(SEQUENCE_STYLES.some(s=>s[0]==='custom'));
 assert.throws(()=>validateSequence({slides},6));assert.throws(()=>validateSequence({slides:[{options:[{title:'A',prompt:''},{title:'B',prompt:'ok'}]}]},2));
});
test('generated slide prompt and model survive editable project roundtrip',()=>{
 const slide={headline:'',body:'',image:'/generated.jpg',imagePrompt:'Preserve outfit, change angle.',imageModel:'chosen-model'};
 const p=packCarouselImages([slide]);const restored=unpackCarouselImages(p.slides[0],p.assets);assert.equal(restored.imagePrompt,slide.imagePrompt);assert.equal(restored.imageModel,slide.imageModel);
 assert.equal(normalizeSlideDesign({imagePrompt:5}).imagePrompt,undefined);
});
