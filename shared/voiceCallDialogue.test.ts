import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceCallDialogue } from './voiceCallDialogue';

test('call language overrides saved conversation language without changing persona settings', () => {
  const persona = { name: 'Fixture', personalityTraits: ['Witty'], personalitySettings: { language: 'en', dialect: 'egyptian', primary: 'Witty' } };
  const before = JSON.stringify(persona);
  const arabic = voiceCallDialogue(persona, { mode: 'arabic', dialect: 'levantine' });
  assert.match(arabic, /Begin and primarily converse in Arabic/);
  assert.doesNotMatch(arabic, /Preferred conversation language: English|Use Egyptian/);
  assert.match(arabic, /Primary trait: Witty/);
  const english = voiceCallDialogue({ ...persona, personalitySettings: { ...persona.personalitySettings, language: 'ar' } }, { mode: 'english' });
  assert.match(english, /Begin and primarily converse in English/);
  assert.doesNotMatch(english, /Preferred conversation language: Arabic/);
  const fixedLanguage = voiceCallDialogue(persona, { mode: 'arabic', allowLanguageSwitching: false });
  assert.doesNotMatch(fixedLanguage, /Follow an explicit request to switch/);
  assert.equal(JSON.stringify(persona), before);
});
