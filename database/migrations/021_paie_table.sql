-- Migration 021 — Runs de paie mensuels (clôture pointage → simulateur)
-- Toutes les données métier sont dans paie (TEXT) au format JSON :
-- { mois_annee, statut, synthese, payroll_config, payroll_result, heures_sup, cloture_le, ... }

BEGIN;

CREATE TABLE IF NOT EXISTS public.paie (
  id SERIAL PRIMARY KEY,
  matricul_employe TEXT NOT NULL,
  paie TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_paie_matricul_employe ON public.paie (matricul_employe);

COMMIT;
