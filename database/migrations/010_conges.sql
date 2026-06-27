-- =============================================================================
-- Migration 010 — CONGES (SIRH RDC → Supabase)
-- =============================================================================
-- Règle      : AUCUNE clé étrangère — lien logique matricule_employe → employes.matricule
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION conges_set_modif_le()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modif_le = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.conges (
  id BIGSERIAL PRIMARY KEY,
  matricule_employe TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'annuel',
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  jours INTEGER NOT NULL DEFAULT 0 CHECK (jours >= 0),
  statut TEXT NOT NULL DEFAULT 'demande',
  notes TEXT,
  validateur_1 TEXT,
  validateur_2 TEXT,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  cree_par TEXT,
  modif_le TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  modif_par TEXT,
  CONSTRAINT conges_dates_coherentes CHECK (date_fin >= date_debut)
);

COMMENT ON TABLE public.conges IS 'Congés et absences des employés';
COMMENT ON COLUMN public.conges.validateur_1 IS 'Identifiant utilisateur RH (validateur niveau 1)';
COMMENT ON COLUMN public.conges.validateur_2 IS 'Identifiant utilisateur RH (validateur niveau 2)';

CREATE INDEX IF NOT EXISTS idx_conges_matricule ON public.conges(matricule_employe);
CREATE INDEX IF NOT EXISTS idx_conges_dates ON public.conges(matricule_employe, date_debut DESC);
CREATE INDEX IF NOT EXISTS idx_conges_statut ON public.conges(statut) WHERE statut IN ('demande', 'approuve');

DROP TRIGGER IF EXISTS trg_conges_modif_le ON public.conges;
CREATE TRIGGER trg_conges_modif_le
  BEFORE UPDATE ON public.conges
  FOR EACH ROW EXECUTE FUNCTION conges_set_modif_le();

COMMIT;
