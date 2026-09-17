import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCallPreferences, callLanguageInstructions } from './voiceCallPreferences';

test('call preferences default to Levantine Arabic and discard unknown values', () => {
  assert.deepEqual(normalizeCallPreferences(), { mode: 'arabic', dialect: 'levantine', allowLanguageSwitching: true });
  assert.deepEqual(normalizeCallPreferences({ mode: 'injected', dialect: '__proto__', allowLanguageSwitching: 'false' }),
    { mode: 'arabic', dialect: 'levantine', allowLanguageSwitching: true });
});
test('English with Arabic accent keeps English words and preserves dialect guidance', () => {
  const preferences = normalizeCallPreferences({ mode: 'english-arabic-accent', dialect: 'levantine', allowLanguageSwitching: false });
  assert.equal(preferences.mode, 'english-arabic-accent');
  const instructions = callLanguageInstructions(preferences);
  assert.match(instructions, /English/);
  assert.match(instructions, /Jordanian.*Syrian/);
  assert.match(instructions, /spelling/);
  assert.match(instructions, /do not switch/i);
});

test('Levantine live calls keep the same regional vocabulary safeguards as persona chat', () => {
  const instructions=callLanguageInstructions({mode:'arabic',dialect:'levantine',allowLanguageSwitching:true});
  assert.match(instructions,/Egyptian/);
  assert.match(instructions,/Saudi\/Gulf/);
  assert.match(instructions,/وش، الحين، أبغى/);
  assert.match(instructions,/glottal-stop/);
  assert.match(instructions,/explicitly requests/);
});
