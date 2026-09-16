import test from 'node:test';
import assert from 'node:assert/strict';
import {requestedCallLanguage} from './callLanguageSwitch';
import {callLanguageInstructions,normalizeCallPreferences,withCallPreferences} from './voiceCallPreferences';
import {recognitionLanguage,languageInstructions} from './personaLanguage';
const prefs=normalizeCallPreferences();
test('spoken switches alter call delivery while leaving the speaker and defaults intact',()=>{
 const next=requestedCallLanguage('Can you speak French?',prefs)!;
 assert.equal(next.mode,'fr');assert.equal(prefs.mode,'arabic');
 const speaker={voiceId:'saved-voice',personalitySettings:{language:'ar'}};
 const persona=withCallPreferences(speaker,next);
 assert.equal(persona.voiceId,'saved-voice');assert.equal(recognitionLanguage(persona).browser,'fr-FR');
 assert.match(languageInstructions(persona),/primarily converse in French/);
 assert.equal(requestedCallLanguage('احكي باللهجة المصرية',prefs)?.dialect,'egyptian');
 assert.equal(requestedCallLanguage('switch to a Syrian accent',prefs)?.dialect,'levantine');
 assert.equal(requestedCallLanguage('I met someone who can speak French',prefs),undefined);
 assert.equal(requestedCallLanguage('Speak French', {...prefs,allowLanguageSwitching:false}),undefined);
 assert.match(callLanguageInstructions(next),/Switch language or accent/);
});
