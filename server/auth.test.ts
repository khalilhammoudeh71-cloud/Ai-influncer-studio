import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { isCreatorUser, requireAuth } from './auth';

const originalNodeEnv = process.env.NODE_ENV;
const originalMockAuth = process.env.ALLOW_MOCK_AUTH;
const originalCreatorEmail = process.env.CREATOR_EMAIL;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;

  if (originalMockAuth === undefined) delete process.env.ALLOW_MOCK_AUTH;
  else process.env.ALLOW_MOCK_AUTH = originalMockAuth;

  if (originalCreatorEmail === undefined) delete process.env.CREATOR_EMAIL;
  else process.env.CREATOR_EMAIL = originalCreatorEmail;
});

function createResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

test('rejects a missing authorization header in production', async () => {
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_MOCK_AUTH = 'true';

  const request = { headers: {} } as any;
  const response = createResponse();
  let nextCalled = false;

  await requireAuth(request, response as any, () => { nextCalled = true; });

  assert.equal(response.statusCode, 401);
  assert.equal(nextCalled, false);
  assert.equal(request.user, undefined);
});

test('allows an explicit mock user only during local development', async () => {
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_MOCK_AUTH = 'true';

  const request = { headers: {} } as any;
  const response = createResponse();
  let nextCalled = false;

  await requireAuth(request, response as any, () => { nextCalled = true; });

  assert.equal(response.statusCode, 200);
  assert.equal(nextCalled, true);
  assert.equal(request.user?.id, 'local-development-user');
  assert.equal(request.user?.email, 'mock@example.com');
});

test('requires an explicitly configured creator email', () => {
  process.env.NODE_ENV = 'production';
  delete process.env.CREATOR_EMAIL;
  assert.equal(isCreatorUser('creator@example.com'), false);

  process.env.CREATOR_EMAIL = 'creator@example.com';
  assert.equal(isCreatorUser('CREATOR@example.com'), true);
  assert.equal(isCreatorUser('someone@example.com'), false);
});
