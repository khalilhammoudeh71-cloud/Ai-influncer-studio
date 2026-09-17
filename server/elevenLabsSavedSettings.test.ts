import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePersonaVoiceEngine, AUTO_PERSONA_VOICE_ENGINE } from '../src/utils/personaVoiceEngine';
import { VoiceLifecycle } from './personaVoiceLifecycle';
import { mergeVoiceDraft } from '../shared/personaVoiceLifecycle';
import { restoreSavedVoice } from '../shared/personaVoiceLibrary';

test('saved voice settings survive draft merges and can return to automatic language', () => {
  const saved = {elevenLabsSpeechModel:'eleven_flash_v2_5',elevenLabsLanguageOverride:'ar'};
  assert.equal(mergeVoiceDraft(saved, {}).elevenLabsSpeechModel,'eleven_flash_v2_5');
  assert.equal(mergeVoiceDraft(saved, {elevenLabsLanguageOverride:''}).elevenLabsLanguageOverride,'');
  const restored = restoreSavedVoice({id:'one',name:'Original',savedAt:'',updatedAt:'',...saved} as any);
  assert.equal(restored.elevenLabsSpeechModel,'eleven_flash_v2_5');
  assert.equal(restored.elevenLabsLanguageOverride,'ar');
});

test('automatic persona speech uses saved Flash model without replacing voice identity', () => {
  const persona = {voiceEngine:'elevenlabs', voiceId:'abcdefghijklmnopqrst', elevenLabsSpeechModel:'eleven_flash_v2_5', personalitySettings:{language:'ar'}};
  assert.equal(resolvePersonaVoiceEngine(persona as any, AUTO_PERSONA_VOICE_ENGINE), 'eleven_flash_v2_5');
  assert.equal(resolvePersonaVoiceEngine(persona as any, 'eleven_v3'), 'eleven_v3');
  assert.equal(resolvePersonaVoiceEngine({...persona,elevenLabsSpeechModel:'invalid'} as any, AUTO_PERSONA_VOICE_ENGINE), 'eleven_v3');
});

test('clone preview sends Flash 2.5 and Arabic override to ElevenLabs', async () => {
  let speech: any;
  const lifecycle = new VoiceLifecycle({} as any, async (url: any, init?: RequestInit) => {
    if(String(url).includes('/text-to-speech/')) {
      speech = JSON.parse(String(init?.body));
      return new Response(new Uint8Array(120), {headers:{'Content-Type':'audio/mpeg'}});
    }
    return Response.json({voice_id:'existing-voice',category:'cloned'});
  });
  await lifecycle.preview('fixture-key','existing-voice','أهلين، كيفك؟', {stability:0.5}, 'eleven_flash_v2_5', 'ar');
  assert.equal(speech.model_id,'eleven_flash_v2_5');
  assert.equal(speech.language_code,'ar');
  assert.equal(speech.text,'أهلين، كيفك؟');
});
