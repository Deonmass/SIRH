-- =============================================================================
-- Migration 022 — CONFIGURATION (paramètres applicatifs par section)
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.configuration (
  id            SERIAL PRIMARY KEY,
  titre_config  TEXT NOT NULL,
  params        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by    TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS configuration_titre_config_unique
  ON public.configuration (titre_config);

CREATE OR REPLACE FUNCTION configuration_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS configuration_updated_at ON public.configuration;
CREATE TRIGGER configuration_updated_at
  BEFORE UPDATE ON public.configuration
  FOR EACH ROW
  EXECUTE FUNCTION configuration_set_updated_at();

COMMIT;
