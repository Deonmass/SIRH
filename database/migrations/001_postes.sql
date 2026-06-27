-- =============================================================================
-- Migration 001 — POSTES (SIRH RDC → Supabase)
-- =============================================================================
-- Statut     : PROPOSITION — valider avant exécution
-- Règle      : AUCUNE clé étrangère — liaisons par TEXT (code, matricule)
-- Paie       : colonne unique `poste_paie` (JSONB)
-- =============================================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE poste_statut AS ENUM ('draft', 'active', 'vacant', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE poste_grade AS ENUM (
    'Direction',
    'Cadre supérieur',
    'Cadre',
    'Agent maîtrise',
    'Agent',
    'Ouvrier'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE poste_type_contrat AS ENUM ('CDI', 'CDD', 'apprentissage', 'stage', 'consultant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION postes_set_modif_le()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modif_le = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Table POSTES ──────────────────────────────────────────────────────────────
-- Liens logiques (sans FK) :
--   sup_code  → postes.code du supérieur
--   cree_par  → matricule ou email utilisateur RH

CREATE TABLE IF NOT EXISTS postes (
  id          BIGSERIAL PRIMARY KEY,

  code        TEXT NOT NULL,
  titre       TEXT NOT NULL,
  dept        TEXT NOT NULL,
  grade       poste_grade NOT NULL,

  sup_code            TEXT,
  statut              poste_statut NOT NULL DEFAULT 'draft',
  type_contrat        poste_type_contrat NOT NULL DEFAULT 'CDI',
  type_emp            TEXT,
  lieu_affectation    TEXT,
  effectif            INTEGER NOT NULL DEFAULT 1 CHECK (effectif >= 1),

  description         TEXT NOT NULL DEFAULT '',
  missions            TEXT NOT NULL DEFAULT '',
  exigences           TEXT NOT NULL DEFAULT '',
  competences_cles    TEXT NOT NULL DEFAULT '',
  kpi                 TEXT,

  poste_paie  JSONB NOT NULL DEFAULT '{}'::jsonb,

  cree_le     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  cree_par    TEXT,
  modif_le    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  modif_par   TEXT,

  CONSTRAINT postes_code_unique UNIQUE (code)
);

COMMENT ON TABLE postes IS 'Fiches de poste — paie en JSON (poste_paie)';
COMMENT ON COLUMN postes.code IS 'Code poste ex. POSTE-RH-2026-0042';
COMMENT ON COLUMN postes.sup_code IS 'Code poste supérieur hiérarchique';
COMMENT ON COLUMN postes.type_contrat IS 'CDI, CDD, apprentissage, stage, consultant';
COMMENT ON COLUMN postes.type_emp IS 'Type employé cible : interne | externe | journalier';
COMMENT ON COLUMN postes.poste_paie IS 'Package paie JSON — voir PostePaieJson (001_postes.types.ts)';
COMMENT ON COLUMN postes.cree_par IS 'Matricule ou email du créateur';

CREATE INDEX IF NOT EXISTS idx_postes_code ON postes(code);
CREATE INDEX IF NOT EXISTS idx_postes_statut ON postes(statut);
CREATE INDEX IF NOT EXISTS idx_postes_dept ON postes(dept);
CREATE INDEX IF NOT EXISTS idx_postes_sup_code ON postes(sup_code) WHERE sup_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_postes_cree_le ON postes(cree_le DESC);
CREATE INDEX IF NOT EXISTS idx_postes_paie ON postes USING gin (poste_paie);

ALTER TABLE public.postes
  ADD COLUMN IF NOT EXISTS type_emp TEXT;

DROP TRIGGER IF EXISTS trg_postes_modif_le ON postes;
CREATE TRIGGER trg_postes_modif_le
  BEFORE UPDATE ON postes
  FOR EACH ROW EXECUTE FUNCTION postes_set_modif_le();

COMMIT;

-- =============================================================================
-- Exemple poste_paie (clés courtes en français)
-- =============================================================================
-- INSERT INTO postes (code, titre, dept, grade, type_contrat, sup_code, poste_paie, cree_par)
-- VALUES (
--   'POSTE-RH-2026-0042',
--   'Comptable senior',
--   'Finance',
--   'Cadre',
--   'CDI',
--   'POSTE-DG-2026-0001',
--   '{
--     "base": 350,
--     "devise": "USD",
--     "categ": 3,
--     "smig_grade": 3,
--     "smig_cat": "Catégorie 3",
--     "logem": 75,
--     "trans_j": 12,
--     "syndic": false,
--     "notes": "",
--     "j_pres": 26,
--     "j_mal": 0,
--     "j_ca": 0,
--     "j_fer": 0,
--     "charges": 2,
--     "autre_ret": 0,
--     "avantages": [
--       { "type": "transport", "lib": "Prime transport", "montant": 40, "devise": "USD", "impos": false, "cotis": false }
--     ]
--   }'::jsonb,
--   'RH-ADMIN'
-- );
