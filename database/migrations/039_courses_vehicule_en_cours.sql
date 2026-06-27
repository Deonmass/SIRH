-- =============================================================================
-- Migration 039 — Statut en_cours (départ sans clôture immédiate)
-- =============================================================================

BEGIN;

ALTER TABLE public.courses_vehicule
  DROP CONSTRAINT IF EXISTS courses_vehicule_statut_check;

ALTER TABLE public.courses_vehicule
  ADD CONSTRAINT courses_vehicule_statut_check CHECK (
    statut IN ('demande', 'affecte', 'en_cours', 'terminee')
  );

COMMIT;
