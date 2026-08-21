import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { isLocalFileStorageEnabled, localUserSegment, readLocalStore } from './local-store';

const originalNodeEnv = process.env.NODE_ENV;
const originalLocalStorage = process.env.ALLOW_LOCAL_FILE_STORAGE;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;

  if (originalLocalStorage === undefined) delete process.env.ALLOW_LOCAL_FILE_STORAGE;
  else process.env.ALLOW_LOCAL_FILE_STORAGE = originalLocalStorage;
});

test('never enables file storage in production', () => {
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_LOCAL_FILE_STORAGE = 'true';
  assert.equal(isLocalFileStorageEnabled(), false);
  assert.deepEqual(readLocalStore('user-a', 'personas', []), []);
});

test('requires an explicit local-development opt in', () => {
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_LOCAL_FILE_STORAGE = 'false';
  assert.equal(isLocalFileStorageEnabled(), false);

  process.env.ALLOW_LOCAL_FILE_STORAGE = 'true';
  assert.equal(isLocalFileStorageEnabled(), true);
});

test('uses opaque, stable, user-specific directory segments', () => {
  const first = localUserSegment('user-a');
  assert.equal(first, localUserSegment('user-a'));
  assert.notEqual(first, localUserSegment('user-b'));
  assert.match(first, /^[a-f0-9]{24}$/);
  assert.equal(first.includes('user-a'), false);
});
