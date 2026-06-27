-- =============================================================================
-- Migration 008 — COORDONNEES JSONB sur EMPLOYES
-- =============================================================================
-- Historique des coordonnées (adresse, téléphones, e-mails…) en JSONB.
-- =============================================================================

BEGIN;

ALTER TABLE public.employes
  ADD COLUMN IF NOT EXISTS coordonnees JSONB NOT NULL DEFAULT '{"historique":[]}'::jsonb;

COMMENT ON COLUMN public.employes.coordonnees IS
  'Historique JSON des coordonnées (adresse, téléphones, e-mails, contact urgence).';

CREATE INDEX IF NOT EXISTS idx_employes_coordonnees_gin ON public.employes USING gin (coordonnees);

COMMIT;
