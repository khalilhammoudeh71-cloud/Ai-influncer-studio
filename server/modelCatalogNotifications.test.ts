import assert from 'node:assert/strict';
import test from 'node:test';
import {
  unreadModelNotifications,
  updateModelCatalogHistory,
  type ModelCatalogHistory,
} from './modelCatalogNotifications';

const model = (id: string, name = id, provider = 'WaveSpeed') => ({
  id,
  name,
  provider,
  type: 'text-to-image',
});

test('the first catalog inspection establishes a baseline without notifying about every existing model', () => {
  const history = updateModelCatalogHistory(null, [model('existing-a'), model('existing-b')], '2026-09-23T14:00:00.000Z');

  assert.deepEqual(history.knownModelIds, ['existing-a', 'existing-b']);
  assert.deepEqual(history.notifications, []);
  assert.equal(history.checkedAt, '2026-09-23T14:00:00.000Z');
});

test('a later inspection reports only model IDs that have never appeared before', () => {
  const previous: ModelCatalogHistory = {
    checkedAt: '2026-09-22T14:00:00.000Z',
    knownModelIds: ['existing-a', 'removed-but-known'],
    notifications: [],
  };

  const history = updateModelCatalogHistory(previous, [
    model('existing-a'),
    model('new-video', 'Seedance 3', 'fal.ai'),
    model('new-video', 'Duplicate response', 'fal.ai'),
    model('removed-but-known'),
  ], '2026-09-23T14:00:00.000Z');

  assert.deepEqual(history.notifications, [{
    id: 'new-video@2026-09-23T14:00:00.000Z',
    modelId: 'new-video',
    name: 'Seedance 3',
    provider: 'fal.ai',
    type: 'text-to-image',
    discoveredAt: '2026-09-23T14:00:00.000Z',
  }]);
  assert.deepEqual(history.knownModelIds, ['existing-a', 'removed-but-known', 'new-video']);
});

test('marking notifications read hides the current discoveries but not later ones', () => {
  const history: ModelCatalogHistory = {
    checkedAt: '2026-09-23T14:00:00.000Z',
    knownModelIds: ['a', 'b'],
    notifications: [
      { id: 'a@1', modelId: 'a', name: 'A', provider: 'Wiro', type: 'text-to-image', discoveredAt: '2026-09-22T14:00:00.000Z' },
      { id: 'b@2', modelId: 'b', name: 'B', provider: 'Runware', type: 'image-to-video', discoveredAt: '2026-09-23T14:00:00.000Z' },
    ],
  };

  assert.deepEqual(unreadModelNotifications(history, '2026-09-22T14:00:00.000Z').map(item => item.modelId), ['b']);
  assert.deepEqual(unreadModelNotifications(history, '2026-09-23T14:00:00.000Z'), []);
});
