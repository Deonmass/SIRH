-- =============================================================================
-- Migration 023 — UTILISATEURS (comptes applicatifs + permissions JSONB)
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.utilisateurs (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  passeword TEXT NOT NULL,
  matricul_agent TEXT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS utilisateurs_matricul_agent_idx
  ON public.utilisateurs (matricul_agent)
  WHERE matricul_agent IS NOT NULL;

CREATE OR REPLACE FUNCTION utilisateurs_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS utilisateurs_updated_at ON public.utilisateurs;
CREATE TRIGGER utilisateurs_updated_at
  BEFORE UPDATE ON public.utilisateurs
  FOR EACH ROW
  EXECUTE FUNCTION utilisateurs_set_updated_at();

COMMIT;
