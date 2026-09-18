import test from 'node:test';
import assert from 'node:assert/strict';
import { requiresTranscriptConfirmation as review } from './transcriptionQuality';
const result=(text:string,prob=-.05)=>({text,logprobs:[{logprob:prob}]});
test('uncertain recognition and strongly conflicting alternatives require review',()=>{
 assert.equal(review(result('بدي قهوة بدون سكر'),'بدي قهوة بدون سكر'),false);
 assert.equal(review(result('I need a coffee'),'I need coffee'),false);
 assert.equal(review(result('night light kite'),'buy a flight'),true);
 assert.equal(review(result('One',-3)),true);
 assert.equal(review({text:'One'}),true);
 assert.equal(review(result('')),true);
});
test('a provider transcript without logprobs can still be accepted when it matches the draft',()=>{
 assert.equal(review({text:'بدي صورة إلي'},'بدي صورة إلي'),false);
 assert.equal(review({text:'كلام مختلف تماما'},'بدي صورة إلي'),true);
});
