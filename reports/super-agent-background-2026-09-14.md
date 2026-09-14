# Super Agent background execution — September 14

This increment hardens the existing media-job worker. Whole-plan background execution is still pending: the browser currently coordinates the next step of an approved plan.

## Changes

- Every worker heartbeat, success, and failure write now requires the same running attempt and account that originally claimed the job.
- An older worker cannot overwrite a newer attempt, a completed result, or a cancellation.
- Only an accepted completion writes its output into the Library.
- Cancellation uses a conditional update so a concurrent completion cannot be changed back to running.
- Claims and malformed-request handling respect cancellation and concurrent state changes.

## Verification

Nine focused tests passed, including four new SQL-predicate tests. The new tests first reproduced three failures with the previous unguarded write condition. They execute the real Drizzle-generated condition against a local SQLite table; they are not a live PostgreSQL concurrency test.

The API bundle compiled successfully. Deployment and type-check status are recorded in the task response.

## Remaining work

Persist the entire approved plan server-side, associate each step with its media job, and advance dependencies from the worker. Add reconnect progress and explicit cancellation/resume behavior. A stale provider request can still incur work at the provider: fencing prevents stale database writes, but does not establish provider-side exactly-once generation or cancellation. Those need provider request identifiers and recovery rather than blind resubmission.
