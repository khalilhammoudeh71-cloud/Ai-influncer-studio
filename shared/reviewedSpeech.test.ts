import { createSpokenDialogueStream } from '../server/voiceRouting';
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

test('Arabic hesitation pauses do not consume sentence slots or cut off the thought',()=>{
 const chunks:string[]=[];const reviewed=createReviewedSpeech(x=>chunks.push(x),()=>true,2);
 const stream=createSpokenDialogueStream(x=>reviewed.push(x));
 stream.push('طيب... كنت عم... ');assert.equal(chunks.length,0);
 stream.push('أقرأ كتاب. ');stream.flush();assert.equal(chunks.join(''),'طيب... كنت عم... أقرأ كتاب. ');
});
test('unfinished ellipsis endings are not spoken as complete sentences',()=>{
 const chunks:string[]=[];const reviewed=createReviewedSpeech(x=>chunks.push(x),()=>true,2);
 reviewed.push('كنت عم...');assert.equal(chunks.length,0);
 reviewed.push('كيفك؟');assert.equal(chunks.join(''),'كيفك؟ ');
});

test('an ellipsis split across network chunks still stays inside its sentence',()=>{
 const chunks:string[]=[];const reviewed=createReviewedSpeech(x=>chunks.push(x),()=>true,2);
 const stream=createSpokenDialogueStream(x=>reviewed.push(x));
 stream.push('طيب.');assert.equal(chunks.length,0);
 stream.push('.. كنت عم.');assert.equal(chunks.length,0);
 stream.push('.. أقرأ كتاب.');stream.flush();
 assert.equal(chunks.join(''),'طيب... كنت عم... أقرأ كتاب. ');
});

test('repeated Arabic sentences are spoken once without consuming the next thought',()=>{const chunks:string[]=[];const stream=createReviewedSpeech(x=>chunks.push(x),()=>true,3);stream.push('شو في؟');stream.push('شو في؟');stream.push('شو فِي!');stream.push('سامعتك تمام.');assert.equal(chunks.join(''),'شو في؟ سامعتك تمام. ');});

test('short question echoes of the preceding ending never reach speech',()=>{const chunks:string[]=[];const s=createReviewedSpeech(x=>chunks.push(x),()=>true,5);s.push('شو رأيك نعمل شي هادي أول؟');s.push('أول؟');s.push('هادي أول؟');s.push('شو بتحب؟');assert.equal(chunks.join(''),'شو رأيك نعمل شي هادي أول؟ شو بتحب؟ ');});

test('network streamed Arabic suffix echoes are omitted from the published transcript',()=>{const chunks:string[]=[];const r=createReviewedSpeech(x=>chunks.push(x),()=>true,5);const s=createSpokenDialogueStream(x=>r.push(x));s.push('شو رأيك نعمل شي هادي أول؟ أول');s.push('؟ أول؟');s.flush();assert.equal(r.text,'شو رأيك نعمل شي هادي أول؟');});
