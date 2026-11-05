import test from 'node:test';
import assert from 'node:assert/strict';
import { readIdentityFeedback, recordIdentityFeedback } from './identityFeedback';
test('human judgments replace only the same job and retain uncertain judgments',()=>{
 let rows=recordIdentityFeedback({},'job-a','same','2026-11-05T04:00:00Z');
 rows=recordIdentityFeedback(rows,'job-b','uncertain','2026-11-05T04:01:00Z');
 rows=recordIdentityFeedback(rows,'job-a','different','2026-11-05T04:02:00Z');
 assert.equal(rows['job-a'].verdict,'different');assert.equal(rows['job-b'].verdict,'uncertain');
 assert.equal(rows['job-a'].source,'human');
});
test('unreadable data and machine judgments are not imported as human feedback',()=>{
 assert.deepEqual(readIdentityFeedback('broken'),{});
 assert.deepEqual(readIdentityFeedback(JSON.stringify({a:{verdict:'same',source:'model',at:'2026-11-05T04:00:00Z'}})),{});
});
