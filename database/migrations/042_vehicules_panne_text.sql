-- =============================================================================
-- Migration 042 — Colonne panne (text JSON) si créée manuellement
-- L'application accepte panne (text) ou pannes (jsonb, migration 041).
-- =============================================================================

BEGIN;

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS panne text;

COMMENT ON COLUMN public.vehicules.panne IS
  'Historique JSON sérialisé : [{ "type": "panne"|"remise_service", "description": "...", "at": "ISO8601" }]';

COMMIT;
