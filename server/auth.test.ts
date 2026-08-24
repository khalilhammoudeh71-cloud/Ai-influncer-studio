import assert from 'node:assert/strict';
import test from 'node:test';
import { bypassesInternalCredits, isCreatorUser } from './auth';

test('creator email bypasses internal generation credits', () => {
  const previousCreatorEmail = process.env.CREATOR_EMAIL;
  process.env.CREATOR_EMAIL = 'Owner.Name@gmail.com';

  try {
    assert.equal(isCreatorUser('ownername@googlemail.com'), true);
    assert.equal(bypassesInternalCredits('owner.name@gmail.com'), true);
    assert.equal(bypassesInternalCredits('customer@example.com'), false);
  } finally {
    if (previousCreatorEmail === undefined) {
      delete process.env.CREATOR_EMAIL;
    } else {
      process.env.CREATOR_EMAIL = previousCreatorEmail;
    }
  }
});
