import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_PERSONA_VOICE_ENGINE,
  ELEVENLABS_CLONED_VOICE_MODEL,
  MAYA_UNCLONED_VOICE_MODEL,
  hasSavedPersonaVoiceClone,
  resolvePersonaVoiceEngine,
} from '../src/utils/personaVoiceEngine';

test('retains a legacy ElevenLabs-shaped ID without changing its speaker', () => {
  const persona = {
    name: 'New Persona',
    voiceId: 'AbCdEfGhIjKlMnOpQrSt',
    voiceSampleUrl: 'data:audio/wav;base64,AAAA',
  };

  assert.equal(hasSavedPersonaVoiceClone(persona), true);
  assert.equal(
    resolvePersonaVoiceEngine(persona, AUTO_PERSONA_VOICE_ENGINE),
    ELEVENLABS_CLONED_VOICE_MODEL,
  );
});

test('requires selection for an unbound persona', () => {
  const persona = { name: 'Uncloned Persona', voiceId: 'default' };

  assert.equal(hasSavedPersonaVoiceClone(persona), false);
  assert.equal(
    resolvePersonaVoiceEngine(persona, AUTO_PERSONA_VOICE_ENGINE),
    'voice_selection_required',
  );
});

test('does not invent bundled voices from names', () => {
  assert.equal(
    resolvePersonaVoiceEngine({ name: 'Leen Hassan' }, AUTO_PERSONA_VOICE_ENGINE),
    'voice_selection_required',
  );
  assert.equal(
    resolvePersonaVoiceEngine({ name: 'Rawan Hasan' }, AUTO_PERSONA_VOICE_ENGINE),
    'voice_selection_required',
  );
});

test('respects a manually selected voice engine', () => {
  assert.equal(
    resolvePersonaVoiceEngine({ name: 'Leen Hassan' }, 'eleven_flash_v2_5'),
    'eleven_flash_v2_5',
  );
});
