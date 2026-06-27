-- =============================================================================
-- Migration 045 — Corriger noms de colonnes déclaration (ASSUREUR → assureur, etc.)
-- Supabase / PostgREST attend des identifiants snake_case non quotés.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vehicules'
      AND column_name = 'ASSUREUR'
  ) THEN
    ALTER TABLE public.vehicules RENAME COLUMN "ASSUREUR" TO assureur;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vehicules'
      AND column_name = 'DEPARTEMENT'
  ) THEN
    ALTER TABLE public.vehicules RENAME COLUMN "DEPARTEMENT" TO departement;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vehicules'
      AND column_name = 'societe proprietaire'
  ) THEN
    ALTER TABLE public.vehicules RENAME COLUMN "societe proprietaire" TO societe_proprietaire;
  END IF;
END $$;

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS assureur text,
  ADD COLUMN IF NOT EXISTS departement text,
  ADD COLUMN IF NOT EXISTS utilisateur text,
  ADD COLUMN IF NOT EXISTS societe_proprietaire text,
  ADD COLUMN IF NOT EXISTS statut text;

COMMENT ON COLUMN public.vehicules.assureur IS 'Assureur du véhicule';
COMMENT ON COLUMN public.vehicules.departement IS 'Département utilisateur';
COMMENT ON COLUMN public.vehicules.utilisateur IS 'Utilisateur / conducteur assigné';
COMMENT ON COLUMN public.vehicules.societe_proprietaire IS 'Société propriétaire (ex. PPC, LOXEA)';
COMMENT ON COLUMN public.vehicules.statut IS 'Observation technique : Bon état, Avertissement, A déclasser';

CREATE INDEX IF NOT EXISTS idx_vehicules_statut ON public.vehicules (statut);
CREATE INDEX IF NOT EXISTS idx_vehicules_societe_proprietaire ON public.vehicules (societe_proprietaire);
CREATE INDEX IF NOT EXISTS idx_vehicules_departement ON public.vehicules (departement);

-- Recharger le cache schéma PostgREST (Supabase)
NOTIFY pgrst, 'reload schema';

COMMIT;
