import test from 'node:test';import assert from 'node:assert/strict';
import { playDialectPreview, requestDialectPreview } from './dialectPreview';
test('every listen attempt restarts a sample even when the URL is unchanged',async()=>{
 let plays=0;const audio={currentTime:9,play:async()=>{plays++;}};
 await playDialectPreview(audio,()=>assert.fail('unexpected error'));audio.currentTime=9;
 await playDialectPreview(audio,()=>assert.fail('unexpected error'));
 assert.equal(plays,2);assert.equal(audio.currentTime,0);
});
test('blocked playback reports a visible manual-play recovery message',async()=>{
 let error='';await playDialectPreview({currentTime:0,play:async()=>{throw new Error('autoplay blocked');}},message=>{error=message;});assert.match(error,/play.*below/i);
});
test('missing provider audio is an error rather than a silent Listen no-op',async()=>{
 await assert.rejects(()=>requestDialectPreview(async()=>undefined as any,'كِيفَك'),/no audio/i);
 assert.equal(await requestDialectPreview(async()=> 'data:audio/mpeg;base64,AA==','كِيفَك'),'data:audio/mpeg;base64,AA==');
});
