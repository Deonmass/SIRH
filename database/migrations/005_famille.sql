-- =============================================================================
-- Migration 005 — FAMILLE (SIRH RDC → Supabase)
-- =============================================================================
-- Règle      : AUCUNE clé étrangère — lien logique matricule_employe → employes.matricule
-- Objet      : Membres de la famille déclarés (onglet Profil / organigramme familial)
-- =============================================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE famille_lien AS ENUM ('pere', 'mere', 'conjoint', 'enfant', 'autre');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION famille_set_modif_le()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modif_le = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS famille (
  id                BIGSERIAL PRIMARY KEY,

  matricule_employe TEXT NOT NULL,

  lien              famille_lien NOT NULL,
  sexe              employe_sexe,
  nom               TEXT NOT NULL,
  prenom            TEXT NOT NULL,
  date_naiss        DATE NOT NULL,

  a_charge          BOOLEAN NOT NULL DEFAULT false,
  scolarise         BOOLEAN NOT NULL DEFAULT false,

  jugement_recu     BOOLEAN NOT NULL DEFAULT false,
  jugement_fichier  TEXT,
  jugement_nom      TEXT,

  cree_le           TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  cree_par          TEXT,
  modif_le          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  modif_par         TEXT
);

COMMENT ON TABLE famille IS 'Membres de la famille d''un employé';
COMMENT ON COLUMN famille.matricule_employe IS 'Matricule agent — employes.matricule';
COMMENT ON COLUMN famille.lien IS 'pere | mere | conjoint | enfant | autre';
COMMENT ON COLUMN famille.a_charge IS 'Personne à charge (IRPP, allocations…)';

CREATE INDEX IF NOT EXISTS idx_famille_matricule ON famille(matricule_employe);
CREATE INDEX IF NOT EXISTS idx_famille_lien ON famille(lien);
CREATE INDEX IF NOT EXISTS idx_famille_a_charge ON famille(matricule_employe) WHERE a_charge = true;

DROP TRIGGER IF EXISTS trg_famille_modif_le ON famille;
CREATE TRIGGER trg_famille_modif_le
  BEFORE UPDATE ON famille
  FOR EACH ROW EXECUTE FUNCTION famille_set_modif_le();

COMMIT;
