import test from 'node:test';import assert from 'node:assert/strict';
import { videoIdentityInput } from './videoIdentityInput';
test('video inspection accepts bounded provider media and refuses arbitrary hosts before fetch',async()=>{
 let calls=0;const request=async()=>{calls++;return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'video/mp4'}})};
 const part=await videoIdentityInput('https://cdn.wavespeed.ai/result.mp4',request as typeof fetch);
 assert.equal(part.inlineData.mimeType,'video/mp4');assert.equal(part.inlineData.data,'AQID');
 assert.equal(part.videoMetadata.fps,2);
 await assert.rejects(videoIdentityInput('http://127.0.0.1/private',request as typeof fetch),/host/);assert.equal(calls,1);
});
test('inspection refuses oversized and non-video responses',async()=>{
 await assert.rejects(videoIdentityInput('https://fal.media/result.mp4',async()=>new Response('x',{headers:{'content-length':'20000000','content-type':'video/mp4'}})),/large/);
 await assert.rejects(videoIdentityInput('https://fal.media/result.mp4',async()=>new Response('x',{headers:{'content-type':'text/html'}})),/video/);
});
