import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceRecheck, audioRecheckEnabled } from './voiceRecheck';
import { VoiceAudioBuffer, wavDataUrl } from './voiceAudioCapture';
test('accuracy defaults on; only an explicit off disables it',()=>{
 for(const saved of [null,'','on','invalid'])assert.equal(audioRecheckEnabled(saved),true);
 assert.equal(audioRecheckEnabled('off'),false);
});
test('continued speech cancels the stale result while retaining opening words and audio',()=>{
 const q=new VoiceRecheck(),first=q.begin('I would like',1000);
 q.interrupt();assert.equal(q.current(first.controller),false);
 const next=q.begin('a coffee',2000);assert.equal(next.text,'I would like a coffee');assert.equal(next.start,1000);
 q.finish(first.controller);assert.equal(q.current(next.controller),true);
 q.finish(next.controller);const final=q.begin('Thanks',3000);assert.equal(final.text,'Thanks');assert.equal(final.start,3000);
 q.reset();assert.equal(final.controller.signal.aborted,true);assert.equal(q.begin('New call',5000).text,'New call');
});
test('audio capture encodes mono 16k WAV, clips opening and clears on mute/end',()=>{
 const ring=new VoiceAudioBuffer(48000);ring.push(new Float32Array(48000).fill(.5),1000);
 const bytes=ring.wavSince(500,1000)!;const data=new DataView(bytes.buffer);
 assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(data.getUint16(22,true),1);
 assert.equal(data.getUint32(24,true),16000);assert.equal(data.getUint32(40,true),16000);assert.equal(bytes.length,16044);
 assert.match(wavDataUrl(bytes),/^data:audio\/wav;base64,UklGR/);
 ring.clear();assert.equal(ring.wavSince(0),undefined);
 ring.push(new Float32Array(48000),1000);ring.push(new Float32Array(48000),47001);
 assert.equal(ring.wavSince(0,47001)!.length,32044);
});
