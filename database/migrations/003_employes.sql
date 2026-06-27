-- =============================================================================
-- Migration 003 — EMPLOYES (SIRH RDC → Supabase)
-- =============================================================================
-- Statut     : PROPOSITION — valider avant exécution
-- Règle      : AUCUNE clé étrangère
-- Périmètre  : onglets Profil + Coordonnées (+ audit)
-- =============================================================================

BEGIN;

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE employe_sexe AS ENUM ('M', 'F');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE employe_statut_mat AS ENUM ('celibataire', 'marie', 'divorce', 'veuf');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION employes_set_modif_le()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modif_le = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Table EMPLOYES ────────────────────────────────────────────────────────────
-- Liens logiques (sans FK) :
--   cree_par          → matricule ou email utilisateur RH

CREATE TABLE IF NOT EXISTS employes (
  id                BIGSERIAL PRIMARY KEY,

  -- Onglet Profil
  matricule         TEXT NOT NULL,
  nom               TEXT NOT NULL,
  post_nom          TEXT,
  prenom            TEXT NOT NULL,
  sexe              employe_sexe NOT NULL DEFAULT 'M',
  date_naiss        DATE,
  lieu_naiss        TEXT,
  nationalite       TEXT NOT NULL DEFAULT 'Congolaise (RDC)',
  statut_mat        employe_statut_mat NOT NULL DEFAULT 'celibataire',

  -- Onglet Coordonnées
  adresse           TEXT,
  email_pro         TEXT,
  tel               TEXT,

  -- Audit
  cree_le           TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  cree_par          TEXT,
  modif_le          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  modif_par         TEXT,

  CONSTRAINT employes_matricule_unique UNIQUE (matricule)
);

COMMENT ON TABLE employes IS 'Employé — identité, coordonnées, audit (profil + coordonnées du dossier)';
COMMENT ON COLUMN employes.matricule IS 'Matricule ex. RDC-2026-0003';
COMMENT ON COLUMN employes.email_pro IS 'Email professionnel';

CREATE INDEX IF NOT EXISTS idx_employes_matricule ON employes(matricule);
CREATE INDEX IF NOT EXISTS idx_employes_nom ON employes(nom, prenom);
CREATE INDEX IF NOT EXISTS idx_employes_cree_le ON employes(cree_le DESC);

DROP TRIGGER IF EXISTS trg_employes_modif_le ON employes;
CREATE TRIGGER trg_employes_modif_le
  BEFORE UPDATE ON employes
  FOR EACH ROW EXECUTE FUNCTION employes_set_modif_le();

COMMIT;

-- INSERT INTO employes (matricule, nom, prenom, email_pro, tel, cree_par)
-- VALUES ('RDC-2026-0001', 'Mutombo', 'Daniel', 'd.mutombo@exemple.cd', '+243 800 000 000', 'RH-ADMIN');
