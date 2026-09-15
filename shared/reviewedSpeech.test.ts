import test from 'node:test';import assert from 'node:assert/strict';
import { createReviewedSpeech } from './reviewedSpeech';
test('publishes a complete approved sentence before the response finishes, once only',()=>{
 const chunks:string[]=[];const stream=createReviewedSpeech(x=>chunks.push(x),()=>true,2);
 stream.push('First thought.');assert.equal(chunks.join(''),'First thought. ');
 stream.push('Second thought.');stream.push('Third thought.');
 assert.equal(chunks.join(''),'First thought. Second thought. ');
});
test('does not release incomplete or rejected text and limits filler mannerisms',()=>{
 const chunks:string[]=[];const stream=createReviewedSpeech(x=>chunks.push(x),x=>!x.toLowerCase().includes('rejected'),3);
 stream.push('unfinished');stream.push('rejected.');assert.equal(chunks.length,0);
 stream.push('Um, hello.');stream.push('Um, welcome.');assert.equal(chunks.join(''),'Hello. Welcome. ');
});
