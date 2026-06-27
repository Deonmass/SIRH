-- Migration 018 — Historique disciplinaire JSON (colonne TEXT sur employes)
-- Structure : { "historique": [ ... sanctions ... ] }

BEGIN;

ALTER TABLE public.employes
  ADD COLUMN IF NOT EXISTS discipline TEXT;

COMMIT;
