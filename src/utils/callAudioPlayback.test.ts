import test from 'node:test';
import assert from 'node:assert/strict';
import { CallAudioPlayback } from './callAudioPlayback';
class FakeAudio extends EventTarget {
  src='';volume=1;muted=false;plays=0;pauses=0;
  onended:any=null;onerror:any=null;onplay:any=null;
  play(){this.plays++;assert.ok(this.src,'unlock must include playable media');return Promise.resolve();}
  pause(){this.pauses++;}
  removeAttribute(name:string){if(name==='src')this.src='';}
}
test('call start unlocks playable media and every reply reuses that same element',async()=>{
  const player=new FakeAudio();const playback=new CallAudioPlayback(()=>player as any);
  await playback.unlock();assert.match(player.src,/^data:audio\/wav;base64,/);
  const first=new FakeAudio();first.src='blob:first';let cleaned=0;first.addEventListener('ended',()=>cleaned++);
  assert.equal(playback.prepare(first as any),player);
  assert.equal(player.src,'blob:first');player.dispatchEvent(new Event('ended'));assert.equal(cleaned,1);
  const second=new FakeAudio();second.src='blob:second';assert.equal(playback.prepare(second as any),player);
  assert.equal(player.src,'blob:second');assert.equal(player.plays,1);
});
test('replacing an interrupted reply releases its resources and stale listeners',async()=>{
  const player=new FakeAudio();const playback=new CallAudioPlayback(()=>player as any);await playback.unlock();
  const first=new FakeAudio();first.src='first';let cleaned=0;first.addEventListener('ended',()=>cleaned++);
  playback.prepare(first as any);const next=new FakeAudio();next.src='next';playback.prepare(next as any);
  assert.equal(cleaned,1);player.dispatchEvent(new Event('ended'));assert.equal(cleaned,1);
});
