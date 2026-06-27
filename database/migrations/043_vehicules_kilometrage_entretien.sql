-- =============================================================================
-- Migration 043 — Kilométrage initial & entretien véhicules
-- =============================================================================

BEGIN;

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS kilometrage_initiale integer
    CHECK (kilometrage_initiale IS NULL OR kilometrage_initiale >= 0);

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS entretien text;

COMMENT ON COLUMN public.vehicules.kilometrage_initiale IS 'Compteur kilométrique à la mise en service du véhicule';
COMMENT ON COLUMN public.vehicules.entretien IS 'JSON : seuils, dernier entretien, historique';

COMMIT;
