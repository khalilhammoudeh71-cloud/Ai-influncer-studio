CREATE TABLE IF NOT EXISTS public.agent_runs (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, project_id TEXT NOT NULL,
 message_id TEXT NOT NULL, persona_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'running',
 steps TEXT NOT NULL, source_image TEXT, error TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_runs_worker ON public.agent_runs(status, updated_at);
CREATE INDEX IF NOT EXISTS agent_runs_owner ON public.agent_runs(user_id, project_id);
-- Durable plan allowance and image review state. All mutations use the owner-scoped API.
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS budget_credits INTEGER;
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS used_credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS visual_review BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.media_jobs ADD COLUMN IF NOT EXISTS agent_run_id TEXT;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.agent_runs FROM anon, authenticated;
ALTER TABLE public.media_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.media_jobs FROM anon;
REVOKE ALL ON TABLE public.media_jobs FROM authenticated;
GRANT SELECT ON TABLE public.media_jobs TO authenticated;
