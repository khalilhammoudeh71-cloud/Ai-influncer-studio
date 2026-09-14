-- Bootstrap for clean databases too; the supervision migration is idempotent.
CREATE TABLE IF NOT EXISTS public.agent_runs (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, project_id TEXT NOT NULL,
 message_id TEXT NOT NULL, persona_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'running',
 steps TEXT NOT NULL, source_image TEXT, error TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS campaign TEXT;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.agent_runs FROM anon, authenticated;
