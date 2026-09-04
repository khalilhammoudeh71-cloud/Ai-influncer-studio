import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWiroPersonaPrompt, DEFAULT_RUNWARE_PERSONA_MODEL, DEFAULT_WIRO_PERSONA_MODEL } from './wiroPersona';

test('uses the refusal-reduced Wiro model with a stronger Runware fallback', () => {
  assert.equal(DEFAULT_WIRO_PERSONA_MODEL, 'seed-v2.1-turbo-uncensored');
  assert.equal(DEFAULT_RUNWARE_PERSONA_MODEL, 'deepseek:v4@pro');
});

test('renders one bounded live-call transcript without inventing provider history', () => {
  const prompt = buildWiroPersonaPrompt('You are Leen. Reply naturally.', [
    { role: 'user', content: 'I had a dream about you.' },
    { role: 'assistant', content: 'Tell me.' },
    { role: 'user', content: 'It was intense.' },
  ]);
  assert.match(prompt, /^You are Leen/);
  assert.match(prompt, /CALLER: I had a dream about you\./);
  assert.match(prompt, /PERSONA: Tell me\./);
  assert.match(prompt, /CALLER: It was intense\.\nPERSONA:$/);
});
