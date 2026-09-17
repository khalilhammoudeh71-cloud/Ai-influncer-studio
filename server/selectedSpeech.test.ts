import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchSelectedSpeech } from './selectedSpeech';

function providers() {
 const calls: string[] = [];
 return { calls, elevenlabs: async (id: string) => {calls.push(`el:${id}`);return 'audio-el';},
 openai: async (id: string) => {calls.push(`openai:${id}`);return 'audio-openai';},
 clone: async (engine: string) => {calls.push(`clone:${engine}`);return 'audio-clone';} };
}
test('saved ElevenLabs binding wins over old reference and persona name', async()=>{
 const p=providers(); const result=await dispatchSelectedSpeech({engine:'elevenlabs',voiceId:'saved-id',voiceReference:'old',personaName:'Leen'},p);
 assert.deepEqual(p.calls,['el:saved-id']); assert.equal(result.voiceId,'saved-id');
});
test('unsupported provider cannot synthesize a substituted ElevenLabs voice', async()=>{
 const p=providers(); await assert.rejects(()=>dispatchSelectedSpeech({engine:'fish-audio-s2-pro'},p),/not configured/i);assert.deepEqual(p.calls,[]);
});
test('clone requires a reference and failure does not change provider', async()=>{
 const p=providers(); await assert.rejects(()=>dispatchSelectedSpeech({engine:'omnivoice'},p),/reference/i);
 p.clone=async()=>{throw new Error('provider down');};
 await assert.rejects(()=>dispatchSelectedSpeech({engine:'omnivoice',voiceReference:'fixture'},p),/provider down/);assert.deepEqual(p.calls,[]);
});
test('explicit OpenAI voice reaches only OpenAI with truthful identity', async()=>{
 const p=providers(); const result=await dispatchSelectedSpeech({engine:'openai',voiceId:'nova'},p);
 assert.deepEqual(p.calls,['openai:nova']);assert.deepEqual(result,{audioUrl:'audio-openai',engine:'openai',voiceId:'nova'});
});
test('missing ElevenLabs selection asks for selection rather than choosing a persona name', async()=>{
 const p=providers();await assert.rejects(()=>dispatchSelectedSpeech({engine:'elevenlabs',personaName:'Leen'},p),/select/i);assert.deepEqual(p.calls,[]);
});
test('a failed saved voice never falls back', async()=>{
 const p=providers();p.elevenlabs=async()=>{throw new Error('voice unavailable');};
 await assert.rejects(()=>dispatchSelectedSpeech({engine:'elevenlabs',voiceId:'saved'},p),/voice unavailable/);assert.deepEqual(p.calls,[]);
});
test('single-reference providers never silently discard extra recordings', async()=>{
 const p=providers();await assert.rejects(()=>dispatchSelectedSpeech({engine:'omnivoice',voiceReferences:['first','second']},p),/one reference/i);assert.deepEqual(p.calls,[]);
});
test('selected ElevenLabs v3, Flash and Turbo models preview the saved voice directly',async()=>{
 for(const engine of ['eleven_v3','eleven_flash_v2_5','eleven_turbo_v2_5','eleven_multilingual_v2']){
 const p=providers();const result=await dispatchSelectedSpeech({engine,voiceId:'saved-id'},p);
 assert.deepEqual(p.calls,['el:saved-id']);assert.equal(result.engine,engine);assert.equal(result.voiceId,'saved-id');
 }
});
