-- Migration 016 — formations employé (JSON TEXT sur EMPLOYES)
-- Attributs JSON : id, titre, date_debut, date_fin, niveau, instructeur, commentaire, participation

BEGIN;

ALTER TABLE public.employes
  ADD COLUMN IF NOT EXISTS formations TEXT;

COMMENT ON COLUMN public.employes.formations IS
  'Formations JSON : { "formations": [ { id, titre, date_debut, date_fin, niveau, instructeur, commentaire, participation } ] }';

-- Initialisation vide pour les lignes existantes (optionnel)
UPDATE public.employes
SET formations = '{"formations":[]}'
WHERE formations IS NULL;

COMMIT;
