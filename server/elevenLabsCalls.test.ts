import test from 'node:test';
import assert from 'node:assert/strict';
import { buildElevenLabsCallConfig, prepareElevenLabsCall } from './elevenLabsCalls';

test('private voice authorization precedes provider access even when the saved engine is missing', async () => {
  let providerCalls = 0;
  await assert.rejects(() => prepareElevenLabsCall('owner', { personaId: 'owned', voiceId: 'browser-override' }, {
    readPersonas: async () => [{ ...persona, voiceEngine: null }],
    authorizeVoice: async saved => {
      assert.equal(saved.id, 'owned');
      assert.equal(saved.voiceId, persona.voiceId);
      throw new Error('This private voice is not available to your account.');
    },
    verifyVoice: async () => { providerCalls++; return {}; },
    ensureAgent: async () => { providerCalls++; return 'agent'; },
    token: async () => { providerCalls++; return 'token'; },
  }), /private voice.*account/);
  assert.equal(providerCalls, 0);
});

const persona = { id: 'owned', name: 'Leen', voiceId: 'privateclone123456789', voiceEngine: 'elevenlabs', voiceStability: 64, voiceLikeness: 91, voiceSpeakingSpeed: .93, bio: 'A creative friend.', personalityTraits: ['Playful'] };
test('editing only Tone of Voice changes the hosted call configuration while retaining the saved clone',()=>{
 const saved={...persona,personalityTraits:[],tone:'shy, hesitant',brandVoiceRules:'Older confident speaking style.'};
 const first=buildElevenLabsCallConfig('owner',saved,{mode:'arabic'});
 const edited=buildElevenLabsCallConfig('owner',{...saved,tone:'calm, deliberate'},{mode:'arabic'});
 assert.match(first.conversationConfig.agent.prompt.prompt,/"tone":"shy, hesitant"/);
 assert.match(edited.conversationConfig.agent.prompt.prompt,/"tone":"calm, deliberate"/);
 assert.doesNotMatch(edited.conversationConfig.agent.prompt.prompt,/shy, hesitant/);
 assert.notEqual(first.name,edited.name);
 assert.equal(edited.conversationConfig.tts.voiceId,persona.voiceId);
});
test('live ElevenLabs calls apply the personality delivery switch to speed and stability',()=>{
 const saved={...persona,personalityTraits:['Intimate'],personalitySettings:{voiceEnabled:true,intensities:{Intimate:'strong'}}};
 const on=buildElevenLabsCallConfig('owner',saved,{});
 const off=buildElevenLabsCallConfig('owner',{...saved,personalitySettings:{...saved.personalitySettings,voiceEnabled:false}},{});
 assert.ok(Math.abs(on.conversationConfig.tts.speed!-.85)<1e-9);
 assert.ok(Math.abs(on.conversationConfig.tts.stability!-.67)<1e-9);
 assert.equal(off.conversationConfig.tts.speed,.93);
 assert.equal(off.conversationConfig.tts.stability,.64);
 assert.equal(on.conversationConfig.tts.similarityBoost,.91);
 assert.equal(on.conversationConfig.tts.voiceId,off.conversationConfig.tts.voiceId);
 assert.notEqual(on.name,off.name);
});
for (const sample of ['x', '"a"\n', 'a\nb\n', '\u0000{{🙂}}']) test(`long persona descriptions retain language and correction guidance: ${JSON.stringify(sample)}`,()=>{
 const fill=(limit:number)=>sample.repeat(limit).slice(0,limit);
 const saved={...persona,name:fill(120),tone:fill(800),bio:fill(1600),brandVoiceRules:fill(1600),contentBoundaries:fill(1200),personaNotes:fill(1600),voicePrompt:fill(800),personalityTraits:Array.from({length:30},(_,i)=>`Thoughtful trait ${i}`),personalitySettings:{voiceEnabled:true}};
 const prompt=buildElevenLabsCallConfig('owner',saved,{mode:'arabic',allowLanguageSwitching:true}).conversationConfig.agent.prompt.prompt;
 assert.match(prompt,/قصدي بكرا/);
 assert.match(prompt,/Keep a serious topic restrained/);
 assert.match(prompt,/Begin and primarily converse in Arabic/);
 assert.match(prompt,/Use language_detection/);
 assert.ok(prompt.length<24000);
});
test('reopening an existing conversation waits for the caller instead of greeting again',async()=>{
 let config:any;
 await prepareElevenLabsCall('owner',{personaId:'owned',history:[{role:'user',content:'Let us discuss tomorrow.'}]}, {
  readPersonas:async()=>[persona],authorizeVoice:async()=>{},verifyVoice:async()=>({}),ensureAgent:async value=>{config=value;return 'agent';},token:async()=> 'token',
 });
 assert.equal(config.conversationConfig.agent.firstMessage,'');
});
test('Arabic agent uses the exact saved voice, multilingual speech and patient turns', () => {
  const before = JSON.stringify(persona);
  const config = buildElevenLabsCallConfig('owner', persona, { mode: 'arabic', dialect: 'levantine', allowLanguageSwitching: true });
  assert.equal(config.conversationConfig.agent.language, 'ar');
  assert.match(config.conversationConfig.agent.firstMessage, /[\u0600-\u06ff]/);
  assert.equal(config.conversationConfig.tts.voiceId, 'privateclone123456789');
  assert.equal(config.conversationConfig.tts.modelId, 'eleven_flash_v2_5');
  assert.equal(config.conversationConfig.tts.speed, .93);
  assert.equal(config.conversationConfig.turn.turnEagerness, 'patient');
  assert.ok(config.conversationConfig.languagePresets.en);
  assert.ok(config.conversationConfig.agent.prompt.builtInTools.languageDetection);
  assert.equal(config.platformSettings.auth.enableAuth, true);
  assert.equal(config.platformSettings.privacy.recordVoice, false);
  assert.equal(config.platformSettings.overrides.conversationConfigOverride.tts.voiceId, false);
  assert.equal(JSON.stringify(persona), before);
});
test('accented English starts in English and disables switching when requested', () => {
  const config = buildElevenLabsCallConfig('owner', persona, { mode: 'english-arabic-accent', dialect: 'levantine', allowLanguageSwitching: false });
  assert.equal(config.conversationConfig.agent.language, 'en');
  assert.equal(config.conversationConfig.tts.modelId, 'eleven_flash_v2');
  assert.doesNotMatch(config.conversationConfig.agent.firstMessage, /[\u0600-\u06ff]/);
  assert.equal(config.conversationConfig.agent.prompt.builtInTools.languageDetection, undefined);
  assert.deepEqual(config.conversationConfig.languagePresets, {});
});
test('different accounts and call preferences never reuse the same hosted configuration', () => {
  const config = buildElevenLabsCallConfig('owner', persona, {});
  assert.notEqual(config.name, buildElevenLabsCallConfig('other', persona, {}).name);
  assert.notEqual(config.name, buildElevenLabsCallConfig('owner', persona, { mode: 'english' }).name);
});
test('ownership and provider are checked before touching ElevenLabs', async () => {
  let providerCalls = 0;
  const deps = { readPersonas: async () => [persona], authorizeVoice: async () => {}, verifyVoice: async () => { providerCalls++; return { name: 'Saved' }; }, ensureAgent: async () => { providerCalls++; return 'agent'; }, token: async () => { providerCalls++; return 'token'; } };
  await assert.rejects(() => prepareElevenLabsCall('owner', { personaId: 'other', voiceId: persona.voiceId }, deps), /account/i);
  await assert.rejects(() => prepareElevenLabsCall('owner', { personaId: 'owned' }, { ...deps, readPersonas: async () => [{ ...persona, voiceEngine: 'hume' }] }), /ElevenLabs voice/i);
  assert.equal(providerCalls, 0);
});
test('session ignores browser voice IDs and keeps conversation context out of persistent agent config', async () => {
  let config: any, verified: string | undefined;
  const result = await prepareElevenLabsCall('owner', {
    personaId: 'owned', voiceId: 'someone-elses-voice', preferences: { mode: 'arabic' },
    history: [{ role: 'system', content: 'privileged' }, { role: 'user', content: 'Private call context' }], memories: ['Likes quiet mornings'],
  }, { readPersonas: async () => [persona], authorizeVoice: async () => {}, verifyVoice: async id => { verified = id; return { name: 'Saved voice', labels: { accent: 'levantine' } }; },
    ensureAgent: async value => { config = value; return 'agent-fixture'; }, token: async id => { assert.equal(id, 'agent-fixture'); return 'short-lived-token'; } });
  assert.equal(verified, persona.voiceId);
  assert.equal(result.token, 'short-lived-token');
  assert.equal(result.voiceName, 'Saved voice');
  assert.doesNotMatch(JSON.stringify(config), /Private call context|Likes quiet mornings/);
  assert.match(result.dynamicVariables.call_context, /Private call context/);
  assert.doesNotMatch(result.dynamicVariables.call_context, /privileged/);
  assert.equal('apiKey' in result, false);
});
test('unavailable saved voice does not silently fall back or create an agent', async () => {
  let created = false;
  await assert.rejects(() => prepareElevenLabsCall('owner', { personaId: 'owned' }, {
    readPersonas: async () => [persona], authorizeVoice: async () => {}, verifyVoice: async () => { throw new Error('Voice unavailable'); },
    ensureAgent: async () => { created = true; return 'agent'; }, token: async () => 'token',
  }), /unavailable/);
  assert.equal(created, false);
});
