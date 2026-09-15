import test from 'node:test';
import assert from 'node:assert/strict';
import { VOICE_CLONING_MODELS, voiceCloningModel } from './voiceCloningModels';

test('every previous persona model remains discoverable with its actual provider', () => {
 const previous=['wavespeed:zonos2','wavespeed:qwen3-clone','wavespeed:seed-speech','wavespeed:omnivoice','elevenlabs','elevenlabs:playht','elevenlabs:f5-tts','elevenlabs:mureka-vocal','wiro-voice:openmoss/moss-tts-v1-5','wiro-voice:k2-fsa/omnivoice','wiro-voice:resemble-ai/chatterbox-multilingual','wiro-voice:openbmb/voxcpm2','wiro-voice:fishaudio/s2-pro','openai:tts'];
 for(const id of previous)assert.ok(voiceCloningModel(id),id);
 assert.equal(voiceCloningModel('elevenlabs:f5-tts')?.provider,'Fal');
 assert.equal(voiceCloningModel('elevenlabs:mureka-vocal')?.kind,'singing');
 assert.equal(voiceCloningModel('wavespeed:seed-speech')?.kind,'preset');
 assert.equal(voiceCloningModel('openai:tts')?.kind,'preset');
 assert.equal(voiceCloningModel('constructor'),undefined);
 assert.equal(new Set(VOICE_CLONING_MODELS.map(m=>m.id)).size,VOICE_CLONING_MODELS.length);
});
