-- Migration 020 — Colonnes cree_le / modif_le sur pointage (si table créée sans elles)
BEGIN;

ALTER TABLE public.pointage
  ADD COLUMN IF NOT EXISTS cree_le TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.pointage
  ADD COLUMN IF NOT EXISTS modif_le TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

CREATE OR REPLACE FUNCTION pointage_set_modif_le()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modif_le = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pointage_modif_le ON public.pointage;
CREATE TRIGGER trg_pointage_modif_le
  BEFORE UPDATE ON public.pointage
  FOR EACH ROW EXECUTE FUNCTION pointage_set_modif_le();

COMMIT;
