ALTER TABLE public.media_jobs
  ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'Queued',
  ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

DO $media_job_status_constraint$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.media_jobs'::regclass
      AND conname = 'media_jobs_status_check'
      AND pg_get_constraintdef(oid) NOT ILIKE '%canceled%'
  ) THEN
    ALTER TABLE public.media_jobs DROP CONSTRAINT media_jobs_status_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.media_jobs'::regclass
      AND conname = 'media_jobs_status_check'
  ) THEN
    ALTER TABLE public.media_jobs
      ADD CONSTRAINT media_jobs_status_check
      CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled'));
  END IF;
END
$media_job_status_constraint$;

CREATE INDEX IF NOT EXISTS media_jobs_status_updated_idx
  ON public.media_jobs (status, updated_at);
