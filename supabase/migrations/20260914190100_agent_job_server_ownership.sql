-- Supabase default table grants can also include TRUNCATE, REFERENCES and TRIGGER.
REVOKE ALL ON TABLE public.media_jobs FROM anon, authenticated;
GRANT SELECT ON TABLE public.media_jobs TO authenticated;
