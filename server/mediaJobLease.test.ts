import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { PgDialect } from 'drizzle-orm/pg-core';
import { mediaJobAttemptWhere } from './mediaJobLease';

// Execute the real SQL predicate against a local relational table. These tests
// cover write eligibility; they do not claim PostgreSQL concurrency coverage.
function canWrite(status: string, attempt: number, canceled: number, workerAttempt: number, acknowledgeCancel = false, owner = 'owner') {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE media_jobs(id TEXT, user_id TEXT, status TEXT, attempt INTEGER, cancel_requested INTEGER, result TEXT)');
    db.prepare('INSERT INTO media_jobs VALUES (?, ?, ?, ?, ?, ?)').run('job', 'owner', status, attempt, canceled, 'newer result');
    const query = new PgDialect().sqlToQuery(mediaJobAttemptWhere('job', owner, workerAttempt, acknowledgeCancel)!);
    const sql = query.sql.replace(/\$\d+/g, '?');
    const params = query.params.map(p => typeof p === 'boolean' ? Number(p) : p) as any[];
    const changed = db.prepare(`UPDATE media_jobs SET result = 'worker result' WHERE ${sql}`).run(...params).changes;
    const row = db.prepare('SELECT result FROM media_jobs').get();
    if (!changed) assert.equal(row?.result, 'newer result');
    return Number(changed);
  } finally { db.close(); }
}

test('a replaced worker cannot overwrite or heartbeat a newer attempt', () => {
  assert.equal(canWrite('running', 2, 0, 1), 0);
  assert.equal(canWrite('running', 2, 0, 2), 1);
});
test('a completed or requeued job cannot be changed by a late worker', () => {
  for (const status of ['succeeded', 'failed', 'canceled', 'queued']) assert.equal(canWrite(status, 1, 0, 1), 0);
});
test('canceling jobs reject completion and only their current worker can acknowledge cancellation', () => {
  assert.equal(canWrite('running', 2, 1, 2), 0);
  assert.equal(canWrite('running', 2, 1, 2, true), 1);
  assert.equal(canWrite('running', 2, 1, 1, true), 0);
});
test('another account cannot write the job', () => {
  assert.equal(canWrite('running', 1, 0, 1, false, 'other'), 0);
});
