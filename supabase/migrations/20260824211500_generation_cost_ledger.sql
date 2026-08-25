CREATE TABLE IF NOT EXISTS public.generation_costs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'speech', 'avatar')),
  provider TEXT NOT NULL,
  model_id TEXT,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'succeeded', 'failed')),
  quote_source TEXT NOT NULL,
  estimated_provider_cost_microusd INTEGER NOT NULL CHECK (estimated_provider_cost_microusd >= 0),
  actual_provider_cost_microusd INTEGER CHECK (actual_provider_cost_microusd >= 0),
  reserved_credits INTEGER NOT NULL CHECK (reserved_credits >= 0),
  charged_credits INTEGER NOT NULL DEFAULT 0 CHECK (charged_credits >= 0),
  refunded_credits INTEGER NOT NULL DEFAULT 0 CHECK (refunded_credits >= 0),
  count INTEGER NOT NULL DEFAULT 1 CHECK (count > 0),
  request_metadata TEXT NOT NULL DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS generation_costs_user_created_idx
  ON public.generation_costs (user_id, created_at DESC);

ALTER TABLE public.generation_costs ENABLE ROW LEVEL SECURITY;

-- Billing records are server-only. The application server connects directly
-- to Postgres; browser roles must never be able to forge charges or refunds.
REVOKE ALL ON TABLE public.generation_costs FROM anon, authenticated;
