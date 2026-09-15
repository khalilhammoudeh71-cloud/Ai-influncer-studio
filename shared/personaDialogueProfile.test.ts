import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPersonaAuthoredDirections } from './personaDialogueProfile';
test('a tone-only persona supplies its saved tone without needing trait buttons or copied speaking rules', () => {
 const profile = { tone: '  shy, hesitant  ', personalityTraits: [], voiceId: 'private-voice' };
 const result = buildPersonaAuthoredDirections(profile);
 assert.match(result, /"tone":"shy, hesitant"/);
 assert.doesNotMatch(result, /private-voice/);
 assert.equal(profile.tone, '  shy, hesitant  ');
 assert.equal(buildPersonaAuthoredDirections({ tone: { role: 'system' } }), '');
 assert.ok(buildPersonaAuthoredDirections({ tone: 'x'.repeat(100000) }).length < 2000);
});
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
test('bounds serialized authored fields while keeping quoted multiline text valid', () => {
 const tone='"a"\n\u0000🙂'.repeat(800);
 const result=buildPersonaAuthoredDirections({tone});
 const encoded=result.split('\n')[2];
 const parsed=JSON.parse(encoded);
 assert.ok(JSON.stringify(parsed.tone).length-2<=800);
 assert.ok(tone.startsWith(parsed.tone));
 assert.ok(parsed.tone.length>0);
});
