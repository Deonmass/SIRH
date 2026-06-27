-- =============================================================================
-- Migration 041 — Historique pannes / remises en service (JSON)
-- =============================================================================

BEGIN;

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS pannes jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.vehicules.pannes IS
  'Historique JSON : [{ "type": "panne"|"remise_service", "description": "...", "at": "ISO8601" }]';

CREATE INDEX IF NOT EXISTS idx_vehicules_pannes ON public.vehicules USING gin (pannes);

COMMIT;
