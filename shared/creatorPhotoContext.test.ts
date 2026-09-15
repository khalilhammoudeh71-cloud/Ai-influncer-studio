import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCreatorPhotoContext } from './creatorPhotoContext';
test('missing creator photos never become a claim of loaded reference photos', () => {
 const context = buildCreatorPhotoContext({});
 assert.match(context, /No creator reference photo/);
 assert.doesNotMatch(context, /1 creator reference/);
});
test('a primary photo is recognized without duplicating the gallery entry', () => {
 const context = buildCreatorPhotoContext({ primaryPhoto: 'fixture.jpg', photos: ['fixture.jpg', '', null] });
 assert.match(context, /1 creator reference photo/);
 assert.match(context, /not evidence.*seen/i);
});
