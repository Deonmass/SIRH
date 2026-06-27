-- =============================================================================
-- Migration 040 — Date/heure de demande (timestamptz)
-- =============================================================================

BEGIN;

ALTER TABLE public.courses_vehicule
  ALTER COLUMN date_demande TYPE timestamptz
  USING date_demande::timestamptz;

COMMENT ON COLUMN public.courses_vehicule.date_demande IS 'Date et heure de la demande de course';

COMMIT;
