import test from 'node:test';import assert from 'node:assert/strict';
import { buildVoiceDelivery } from './voiceDelivery';
test('neutral delivery preserves saved settings including zero',()=>{
 const d=buildVoiceDelivery('elevenlabs','eleven_turbo_v2_5','Hello.',{voiceStability:0,voiceLikeness:91,voiceStyleExaggeration:0,voiceSpeakingSpeed:.87},undefined,'neutral');
 assert.deepEqual(d.settings,{stability:0,similarity_boost:.91,style:0,speed:.87,use_speaker_boost:true});assert.equal(d.text,'Hello.');
});
test('provider tags are never spoken by Turbo and emotion adjusts the explicit base without changing the script',()=>{
 const d=buildVoiceDelivery('elevenlabs','eleven_turbo_v2_5','You did it!',{}, {speed:1.1,stability:.7},'excited');
 assert.equal(d.text,'You did it!');assert.equal(d.settings.speed,1.1400000000000001);assert.equal(d.settings.stability,.6499999999999999);
});
test('v3 uses emotional tags and quantized stability, with no unsupported numeric speed',()=>{
 const d=buildVoiceDelivery('elevenlabs','eleven_v3','You did it!',{voiceStability:62,voiceSpeakingSpeed:.9},undefined,'excited');
 assert.match(d.text,/\[excited\]/);assert.equal(d.settings.stability,.5);assert.equal(d.settings.speed,undefined);
});
test('comfort is modestly slower, neutral scripts gain no fillers or text changes',()=>{
 const d=buildVoiceDelivery('elevenlabs','eleven_turbo_v2_5','I am here.',{},undefined,'comforting');
 assert.ok(d.settings.speed!>=.9&&d.settings.speed!<1);assert.equal(d.text,'I am here.');
});
