-- Migration 019 — Feuilles de pointage mensuelles (présences, retards, HS)
-- pointage (TEXT) : JSON { jours[], synthese{}, verrouille, modif_le }

BEGIN;

CREATE TABLE IF NOT EXISTS public.pointage (
  id SERIAL PRIMARY KEY,
  matricul_employe TEXT NOT NULL,
  mois_annee TEXT NOT NULL,
  pointage TEXT,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  modif_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pointage_mois_annee_format CHECK (mois_annee ~ '^\d{4}-\d{2}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pointage_matricule_mois
  ON public.pointage (matricul_employe, mois_annee);

CREATE INDEX IF NOT EXISTS idx_pointage_mois_annee ON public.pointage (mois_annee);

COMMIT;
