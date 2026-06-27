-- =============================================================================
-- Migration 024 — Statut des comptes utilisateurs (TEXT, aligné schéma Supabase)
-- Valeurs : actif | inactif
-- =============================================================================

BEGIN;

ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS statut TEXT NOT NULL DEFAULT 'actif';

COMMENT ON COLUMN public.utilisateurs.statut IS
  'Statut du compte : actif | inactif (connexion refusée si inactif)';

CREATE INDEX IF NOT EXISTS utilisateurs_statut_idx ON public.utilisateurs (statut);

COMMIT;
