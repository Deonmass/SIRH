-- =============================================================================
-- Migration 038 — Colonne statut sur courses_vehicule (correctif)
-- =============================================================================
-- Si la table a été créée sans statut (CREATE TABLE IF NOT EXISTS ignoré ou SQL manuel),
-- cette migration ajoute la colonne et rétro-remplit les valeurs.

BEGIN;

ALTER TABLE public.courses_vehicule
  ADD COLUMN IF NOT EXISTS statut text;

UPDATE public.courses_vehicule
SET statut = CASE
  WHEN kmh_arrive IS NOT NULL OR kmh_depart IS NOT NULL THEN 'terminee'
  WHEN vehicule_id IS NOT NULL OR chauffeur IS NOT NULL THEN 'affecte'
  ELSE 'demande'
END
WHERE statut IS NULL;

ALTER TABLE public.courses_vehicule
  ALTER COLUMN statut SET DEFAULT 'demande';

UPDATE public.courses_vehicule SET statut = 'demande' WHERE statut IS NULL;

ALTER TABLE public.courses_vehicule
  ALTER COLUMN statut SET NOT NULL;

ALTER TABLE public.courses_vehicule
  DROP CONSTRAINT IF EXISTS courses_vehicule_statut_check;

ALTER TABLE public.courses_vehicule
  ADD CONSTRAINT courses_vehicule_statut_check CHECK (
    statut IN ('demande', 'affecte', 'terminee')
  );

CREATE INDEX IF NOT EXISTS idx_courses_vehicule_statut ON public.courses_vehicule (statut);

COMMIT;
