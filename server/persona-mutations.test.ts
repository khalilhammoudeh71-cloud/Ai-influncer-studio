import assert from 'node:assert/strict';
import test from 'node:test';
import type { Persona } from '../src/types';
import { diffPersonaMutations } from '../src/utils/personaMutations';

function persona(id: string, name = id): Persona {
  return {
    id,
    name,
    niche: '',
    tone: '',
    platform: '',
    status: 'Draft',
    avatar: '',
    personalityTraits: [],
    visualStyle: '',
    audienceType: '',
    contentBoundaries: '',
    bio: '',
    brandVoiceRules: '',
    contentGoals: '',
    personaNotes: '',
  };
}

test('classifies each persona mutation exactly once', () => {
  const unchanged = persona('unchanged');
  const previous = [unchanged, persona('updated', 'Before'), persona('removed')];
  const next = [unchanged, persona('updated', 'After'), persona('added')];

  const diff = diffPersonaMutations(previous, next);
  assert.deepEqual(diff.added.map((item) => item.id), ['added']);
  assert.deepEqual(diff.removed.map((item) => item.id), ['removed']);
  assert.deepEqual(diff.updated.map((item) => item.id), ['updated']);
});

test('returns no mutations for equivalent persona lists', () => {
  const list = [persona('one'), persona('two')];
  assert.deepEqual(diffPersonaMutations(list, list.map((item) => ({ ...item }))), {
    added: [],
    removed: [],
    updated: [],
  });
});
