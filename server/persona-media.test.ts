import assert from 'node:assert/strict';
import test from 'node:test';
import { composeMultiPersonaPrompt, resolveCreatorPersona, resolveMediaParticipants } from './persona-media';

const leen = { id: 'leen', name: 'Leen Hassan', referenceImage: 'leen.jpg' };
const rawan = { id: 'rawan', name: 'Rawan Hassan', referenceImage: 'rawan.jpg' };
const drH = { id: 'dr-h', name: 'DR.H', referenceImage: 'dr-h.jpg' };

test('resolves an explicitly named saved persona alongside the active persona', () => {
  const participants = resolveMediaParticipants('Show Leen and Rawan Hassan hanging out', leen, [leen, rawan, drH], drH);
  assert.deepEqual(participants.map(persona => persona.id), ['leen', 'rawan']);
});

test('resolves you and me to the saved creator persona', () => {
  const creator = resolveCreatorPersona([leen, rawan, drH], null);
  const participants = resolveMediaParticipants('Generate an image of you and me together', leen, [leen, rawan, drH], creator);
  assert.deepEqual(participants.map(persona => persona.id), ['leen', 'dr-h']);
});

test('does not treat send me a photo as a request to include the creator', () => {
  const creator = resolveCreatorPersona([leen, rawan, drH], null);
  const participants = resolveMediaParticipants('Send me a photo of you at the beach', leen, [leen, rawan, drH], creator);
  assert.deepEqual(participants.map(persona => persona.id), ['leen']);
});

test('composes separate identity instructions for multi-persona media', () => {
  const prompt = composeMultiPersonaPrompt('Leen and Rawan posing together', [leen, rawan]);
  assert.match(prompt, /Leen Hassan/);
  assert.match(prompt, /Rawan Hassan/);
  assert.match(prompt, /Do not merge, swap, duplicate, or average their faces/);
});
