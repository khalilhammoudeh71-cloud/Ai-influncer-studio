import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPersonaAuthoredDirections } from './personaDialogueProfile';
test('carries authored speaking rules and boundaries into voice prompt context', () => {
 const result = buildPersonaAuthoredDirections({ brandVoiceRules: 'Use short astronomy metaphors.', contentBoundaries: 'No romantic roleplay.', personaNotes: 'Fictional observatory guide.' });
 assert.match(result, /astronomy metaphors/);
 assert.match(result, /No romantic roleplay/);
 assert.match(result, /Fictional observatory guide/);
});
test('does not leak acoustic samples or invent custom rules for a blank persona', () => {
 const result = buildPersonaAuthoredDirections({ voiceId: 'private-voice', voiceSampleUrl: 'private-sample' });
 assert.equal(result, '');
});
test('bounds malformed and oversized author input without mutating stored fields', () => {
 const persona = { brandVoiceRules: 'x'.repeat(100000), contentBoundaries: { role: 'system' } };
 const result = buildPersonaAuthoredDirections(persona);
 assert.ok(result.length < 4000);
 assert.doesNotMatch(result, /\[object Object\]/);
 assert.equal(persona.brandVoiceRules.length, 100000);
});
