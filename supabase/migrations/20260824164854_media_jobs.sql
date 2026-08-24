CREATE TABLE IF NOT EXISTS public.media_jobs (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  persona_client_id text,
  kind text NOT NULL CHECK (kind IN ('image', 'video', 'edit', 'upscale', 'avatar')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  request text NOT NULL,
  result text,
  error text,
  model_id text,
  fallback_model_id text,
  attempt integer NOT NULL DEFAULT 0,
  used_fallback boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS media_jobs_user_created_idx
  ON public.media_jobs (user_id, created_at DESC);

ALTER TABLE public.media_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.media_jobs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.media_jobs TO authenticated;

DO $media_job_policies$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'media_jobs' AND policyname = 'media_jobs_own_select') THEN
    CREATE POLICY media_jobs_own_select ON public.media_jobs FOR SELECT TO authenticated USING ((SELECT auth.uid())::text = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'media_jobs' AND policyname = 'media_jobs_own_insert') THEN
    CREATE POLICY media_jobs_own_insert ON public.media_jobs FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())::text = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'media_jobs' AND policyname = 'media_jobs_own_update') THEN
    CREATE POLICY media_jobs_own_update ON public.media_jobs FOR UPDATE TO authenticated USING ((SELECT auth.uid())::text = user_id) WITH CHECK ((SELECT auth.uid())::text = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'media_jobs' AND policyname = 'media_jobs_own_delete') THEN
    CREATE POLICY media_jobs_own_delete ON public.media_jobs FOR DELETE TO authenticated USING ((SELECT auth.uid())::text = user_id);
  END IF;
END
$media_job_policies$;
