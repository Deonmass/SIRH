-- Migration 017 — table FORMATIONS (catalogue + participants JSONB)

BEGIN;

CREATE TABLE IF NOT EXISTS public.formations (
  id            SERIAL PRIMARY KEY,
  titre         TEXT NOT NULL,
  date_debut    DATE NOT NULL,
  date_fin      DATE NOT NULL,
  niveau        TEXT,
  instructeur   TEXT,
  commentaire   TEXT,
  participation JSONB NOT NULL DEFAULT '[]'::jsonb,
  cree_le       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  modif_le      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.formations IS 'Sessions de formation RH';
COMMENT ON COLUMN public.formations.participation IS
  'Participants JSON : [{ employe_id, matricule, nom, prenom, departement, cote, point_a_atteindre }]';

CREATE INDEX IF NOT EXISTS idx_formations_dates ON public.formations (date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_formations_participation_gin ON public.formations USING gin (participation);

CREATE OR REPLACE FUNCTION formations_set_modif_le()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modif_le = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_formations_modif_le ON public.formations;
CREATE TRIGGER trg_formations_modif_le
  BEFORE UPDATE ON public.formations
  FOR EACH ROW EXECUTE FUNCTION formations_set_modif_le();

COMMIT;
