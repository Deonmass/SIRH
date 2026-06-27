-- =============================================================================
-- Migration 002 — DEPARTEMENTS (SIRH RDC → Supabase)
-- =============================================================================
-- Statut     : PROPOSITION — valider avant exécution
-- Règle      : AUCUNE clé étrangère — liaisons par TEXT (code ou libellé)
-- Liens      : postes.dept → departements.libelle (ou departements.code)
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION departements_set_modif_le()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modif_le = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Table DEPARTEMENTS ────────────────────────────────────────────────────────
-- Liens logiques (sans FK) :
--   postes.dept       → libelle (ex. "Ressources Humaines") ou code (ex. "RH")
--   employes.dept     → idem (future migration employés)
--   cree_par          → matricule ou email utilisateur RH

CREATE TABLE IF NOT EXISTS departements (
  id          BIGSERIAL PRIMARY KEY,

  code        TEXT NOT NULL,
  libelle     TEXT NOT NULL,
  ordre       INTEGER NOT NULL DEFAULT 0,
  actif       BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT NOT NULL DEFAULT '',

  cree_le     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  cree_par    TEXT,
  modif_le    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  modif_par   TEXT,

  CONSTRAINT departements_code_unique UNIQUE (code),
  CONSTRAINT departements_libelle_unique UNIQUE (libelle)
);

COMMENT ON TABLE departements IS 'Référentiel des départements / directions';
COMMENT ON COLUMN departements.code IS 'Code court ex. RH, FIN, DG';
COMMENT ON COLUMN departements.libelle IS 'Intitulé affiché ex. Ressources Humaines';
COMMENT ON COLUMN departements.ordre IS 'Ordre d''affichage (listes, paramètres)';
COMMENT ON COLUMN departements.cree_par IS 'Matricule ou email du créateur';

CREATE INDEX IF NOT EXISTS idx_departements_code ON departements(code);
CREATE INDEX IF NOT EXISTS idx_departements_actif ON departements(actif) WHERE actif = TRUE;
CREATE INDEX IF NOT EXISTS idx_departements_ordre ON departements(ordre, libelle);

DROP TRIGGER IF EXISTS trg_departements_modif_le ON departements;
CREATE TRIGGER trg_departements_modif_le
  BEFORE UPDATE ON departements
  FOR EACH ROW EXECUTE FUNCTION departements_set_modif_le();

-- ── Données initiales (alignées DEFAULT_DEPARTMENTS) ───────────────────────────

INSERT INTO departements (code, libelle, ordre, cree_par)
VALUES
  ('DG',  'Direction Générale',       1, 'SYSTEM'),
  ('RH',  'Ressources Humaines',      2, 'SYSTEM'),
  ('FIN', 'Finance & Comptabilité',   3, 'SYSTEM'),
  ('COM', 'Commercial',               4, 'SYSTEM'),
  ('OPS', 'Opérations',               5, 'SYSTEM'),
  ('IT',  'IT & Digital',             6, 'SYSTEM'),
  ('LOG', 'Logistique',               7, 'SYSTEM'),
  ('JUR', 'Juridique',                8, 'SYSTEM')
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- =============================================================================
-- Exemple
-- =============================================================================
-- SELECT id, code, libelle, ordre, actif FROM departements ORDER BY ordre;
--
-- INSERT INTO departements (code, libelle, ordre, description, cree_par)
-- VALUES ('PROD', 'Production', 9, 'Unité production / usine', 'RH-ADMIN');
