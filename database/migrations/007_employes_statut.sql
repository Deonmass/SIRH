-- =============================================================================
-- Migration 007 — STATUT employé (colonne Supabase)
-- =============================================================================
-- Valeurs : candidat | pre_embauche | essai | actif | conge | suspendu |
--           preavis | sorti | licencie
-- =============================================================================

BEGIN;

ALTER TABLE public.employes
  ADD COLUMN IF NOT EXISTS statut TEXT;

COMMENT ON COLUMN public.employes.statut IS
  'Statut RH : candidat | pre_embauche | essai | actif | conge | suspendu | preavis | sorti | licencie';

CREATE INDEX IF NOT EXISTS idx_employes_statut ON public.employes(statut);

COMMIT;
