import { and, eq } from 'drizzle-orm';
import { mediaJobs } from '../shared/schema';

// Shared boundary for writes made by one running worker.
export function mediaJobAttemptWhere(jobId: string, userId: string, attempt: number, cancelRequested = false) {
  return and(
    eq(mediaJobs.id, jobId),
    eq(mediaJobs.userId, userId),
    eq(mediaJobs.status, 'running'),
    eq(mediaJobs.attempt, attempt),
    eq(mediaJobs.cancelRequested, cancelRequested),
  );
}
