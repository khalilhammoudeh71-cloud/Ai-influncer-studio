import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizePersonaMediaReference,
  normalizePersonaMediaReferences,
  PersonaMediaPersistenceError,
} from './personaMediaPersistence';

const userId = 'user-123';

test('keeps durable account-owned workspace references', () => {
  const reference = `supabase-media://${userId}/image/portrait.jpg`;
  assert.equal(normalizePersonaMediaReference(reference, userId), reference);
});

test('turns expiring signed URLs back into durable references', () => {
  const signed = `https://example.supabase.co/storage/v1/object/sign/workspace-media/${userId}%2Fimage%2Fportrait.jpg?token=temporary`;
  assert.equal(
    normalizePersonaMediaReference(signed, userId),
    `supabase-media://${userId}/image/portrait.jpg`,
  );
});

test('rejects browser blobs, inline data, local files, and ephemeral uploads', () => {
  const temporaryReferences = [
    'blob:https://app.example/temporary',
    'data:image/png;base64,abc',
    'file:///Users/example/photo.png',
    '/uploads/photo.png',
    '/api/uploads/photo.png',
    'https://preview.example/uploads/photo.png',
  ];

  for (const reference of temporaryReferences) {
    assert.throws(() => normalizePersonaMediaReference(reference, userId), PersonaMediaPersistenceError);
  }
});

test('rejects durable references owned by another account', () => {
  assert.throws(
    () => normalizePersonaMediaReference('supabase-media://someone-else/image/photo.jpg', userId),
    /owned by this account/,
  );
});

test('normalizes every persona reference field', () => {
  const signed = `https://example.supabase.co/storage/v1/object/sign/workspace-media/${userId}/image/portrait.jpg?token=temporary`;
  const normalized = normalizePersonaMediaReferences({
    avatar: signed,
    referenceImage: signed,
    alternateReferenceImage: null,
    additionalReferenceImages: [signed],
    bio: 'Keep ordinary persona text unchanged.',
  }, userId);

  assert.equal(normalized.avatar, `supabase-media://${userId}/image/portrait.jpg`);
  assert.equal(normalized.referenceImage, `supabase-media://${userId}/image/portrait.jpg`);
  assert.deepEqual(normalized.additionalReferenceImages, [`supabase-media://${userId}/image/portrait.jpg`]);
  assert.equal(normalized.bio, 'Keep ordinary persona text unchanged.');
});
