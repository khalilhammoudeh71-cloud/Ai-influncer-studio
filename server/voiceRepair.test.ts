import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePersonaVoiceEngine, AUTO_PERSONA_VOICE_ENGINE } from '../src/utils/personaVoiceEngine';
import { selectElevenLabsPersonaVoice } from './voiceRouting';

test('saved providers survive auto routing regardless of name or ID shape',()=>{
 for(const voiceEngine of ['heygen','wiro-voice:openbmb/voxcpm2','fish-audio','preset']) {
  assert.equal(resolvePersonaVoiceEngine({name:'Rawan Hasan',voiceId:'ov7JSkufAlSs386OYTaC',voiceEngine} as any,AUTO_PERSONA_VOICE_ENGINE),voiceEngine);
 }
});
test('catalog names cannot replace a missing exact selection',()=>{
 assert.equal(selectElevenLabsPersonaVoice([{voice_id:'other',name:'Rawan Hasan',category:'cloned'}],'missing','Rawan Hasan'),undefined);
 assert.equal(selectElevenLabsPersonaVoice([{voice_id:'other',name:'Rawan Hasan'}],undefined,'Rawan Hasan'),undefined);
});

test('frontend keeps the unavailable Rawan ID and does not invent an unselected voice', async()=>{
 const {getSavedPersonaVoice}=await import('../src/utils/personaVoiceEngine');
 assert.equal(getSavedPersonaVoice({name:'Rawan Hasan',voiceId:'ov7JSkufAlSs386OYTaC'}).voiceId,'ov7JSkufAlSs386OYTaC');
 assert.equal(getSavedPersonaVoice({name:'Rawan Hasan'}).voiceId,undefined);
});
