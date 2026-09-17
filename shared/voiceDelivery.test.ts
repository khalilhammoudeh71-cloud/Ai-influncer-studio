import test from 'node:test';import assert from 'node:assert/strict';
import { buildVoiceDelivery } from './voiceDelivery';
test('personality matching offsets saved voice controls only when enabled and keeps likeness unchanged',()=>{
 const persona={voiceStability:70,voiceLikeness:94,voiceStyleExaggeration:0,voiceSpeakingSpeed:.85,personalityTraits:['High-Energy'],personalitySettings:{voiceEnabled:true,intensities:{'High-Energy':'strong' as const}}};
 const before=JSON.stringify(persona);
 const on=buildVoiceDelivery('elevenlabs','eleven_flash_v2_5','Hello.',persona,undefined,'neutral');
 assert.ok(Math.abs(on.settings.speed!-.98)<1e-9);
 assert.ok(Math.abs(on.settings.stability-.58)<1e-9);
 assert.ok(Math.abs(on.settings.style-.22)<1e-9);
 assert.equal(on.settings.similarity_boost,.94);
 const off=buildVoiceDelivery('elevenlabs','eleven_flash_v2_5','Hello.',{...persona,personalitySettings:{...persona.personalitySettings,voiceEnabled:false}},undefined,'neutral');
 assert.deepEqual(off.settings,{stability:.7,similarity_boost:.94,style:0,speed:.85,use_speaker_boost:true});
 assert.equal(JSON.stringify(persona),before);
});
test('personality offsets respect preview baselines and remain within provider limits',()=>{
 const persona={personalityTraits:['High-Energy'],personalitySettings:{voiceEnabled:true,intensities:{'High-Energy':'strong' as const}}};
 const d=buildVoiceDelivery('elevenlabs','eleven_flash_v2_5','Hello.',persona,{speed:1.2,stability:0,style:1},'neutral');
 assert.equal(d.settings.speed,1.2);assert.equal(d.settings.stability,0);assert.equal(d.settings.style,1);
 const custom=buildVoiceDelivery('elevenlabs','eleven_flash_v2_5','Hello.',{personalityTraits:['constructor','__proto__'],personalitySettings:{voiceEnabled:true}},undefined,'neutral');
 assert.ok(Object.values(custom.settings).every(value=>typeof value==='boolean'||Number.isFinite(value)));
});
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


test('Arabic v3 delivery carries selected dialect without rewriting words or leaking tags to v2', () => {
 const persona={personalitySettings:{language:'ar' as const,dialect:'jordanian-syrian' as const}};
 const words='كيفك؟ هلأ بدي أحكي معك.';
 assert.equal(buildVoiceDelivery('elevenlabs','eleven_v3',words,persona,undefined,'neutral').text,'[strong Jordanian Syrian accent] '+words);
 assert.equal(buildVoiceDelivery('elevenlabs','eleven_turbo_v2_5',words,persona,undefined,'neutral').text,words);
 assert.equal(buildVoiceDelivery('openai','tts-1',words,persona,undefined,'neutral').text,words);
 assert.equal(buildVoiceDelivery('elevenlabs','eleven_v3','Hello.',persona,undefined,'neutral').text,'Hello.');
 assert.match(buildVoiceDelivery('elevenlabs','eleven_v3',words,{personalitySettings:{language:'ar',dialect:'gulf'}},undefined,'neutral').text,/Saudi accent/);
});
test('direct ElevenLabs model selections keep provider controls and v3 stability constraints',()=>{
 const delivery=buildVoiceDelivery('eleven_v3','eleven_v3','مرحبا',{voiceStability:72},undefined,'neutral');
 assert.equal(delivery.settings.stability,.5);assert.equal(delivery.settings.similarity_boost,.88);
});
