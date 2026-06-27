-- =============================================================================
-- Migration 004 — MOUVEMENTS (SIRH RDC → Supabase)
-- =============================================================================
-- Statut     : PROPOSITION — valider avant exécution
-- Règle      : AUCUNE clé étrangère — liaisons par TEXT (matricule, code poste)
-- Objet      : Journal unique : affectation, promotion, avenants, sorties…
-- =============================================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE type_mouvement AS ENUM (
    'affectation',
    'changement_poste',
    'promotion',
    'mutation',
    'reclassement',
    'embauche',
    'confirmation_contrat',
    'avenant_contrat',
    'renouvellement_cdd',
    'fin_periode_essai',
    'fin_cdd',
    'augmentation',
    'avenant_salaire',
    'avenant_avantages',
    'suspension',
    'reintegration',
    'demission',
    'licenciement',
    'retraite',
    'fin_mission'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION mouvements_set_modif_le()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modif_le = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Table MOUVEMENTS ─────────────────────────────────────────────────────────
-- Liens logiques (sans FK) :
--   matricule_employe  → employes.matricule
--   code_poste         → postes.code
--   document_annexe    → chemin ou URL pièce jointe (PDF avenant, décision…)

CREATE TABLE IF NOT EXISTS mouvements (
  id                BIGSERIAL PRIMARY KEY,

  code_mouvement    TEXT NOT NULL,
  matricule_employe TEXT NOT NULL,
  code_poste        TEXT,
  type_mouvement    type_mouvement NOT NULL,
  date_mouvement    DATE NOT NULL,
  document_annexe   TEXT,

  cree_le           TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  cree_par          TEXT,
  modif_le          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  modif_par         TEXT,

  CONSTRAINT mouvements_code_unique UNIQUE (code_mouvement)
);

COMMENT ON TABLE mouvements IS
  'Mouvements RH — affectation, promotion, contrat, rémunération, sortie (une table unique)';
COMMENT ON COLUMN mouvements.code_mouvement IS
  'Code mouvement ex. MVT-RH-2026-0042';
COMMENT ON COLUMN mouvements.matricule_employe IS
  'Matricule agent — lien logique vers employes.matricule';
COMMENT ON COLUMN mouvements.code_poste IS
  'Code fiche poste — lien logique vers postes.code (nullable si hors poste)';
COMMENT ON COLUMN mouvements.type_mouvement IS
  'Nature du mouvement (affectation, promotion, avenant_contrat, etc.)';
COMMENT ON COLUMN mouvements.date_mouvement IS
  'Date du mouvement (effet ou enregistrement selon processus RH)';
COMMENT ON COLUMN mouvements.document_annexe IS
  'Référence pièce jointe : chemin fichier, URL ou identifiant stockage';
COMMENT ON COLUMN mouvements.cree_le IS 'Date de création (UTC)';
COMMENT ON COLUMN mouvements.cree_par IS 'Matricule ou email du créateur';
COMMENT ON COLUMN mouvements.modif_le IS 'Date de dernière modification (UTC)';
COMMENT ON COLUMN mouvements.modif_par IS 'Matricule ou email du dernier modificateur';

CREATE INDEX IF NOT EXISTS idx_mouvements_matricule_date
  ON mouvements (matricule_employe, date_mouvement DESC);

CREATE INDEX IF NOT EXISTS idx_mouvements_code_poste
  ON mouvements (code_poste)
  WHERE code_poste IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mouvements_type
  ON mouvements (type_mouvement);

DROP TRIGGER IF EXISTS trg_mouvements_modif_le ON mouvements;
CREATE TRIGGER trg_mouvements_modif_le
  BEFORE UPDATE ON mouvements
  FOR EACH ROW EXECUTE FUNCTION mouvements_set_modif_le();

-- Mise à jour si la table existait déjà sans colonnes d'audit
ALTER TABLE mouvements ADD COLUMN IF NOT EXISTS cree_le TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());
ALTER TABLE mouvements ADD COLUMN IF NOT EXISTS cree_par TEXT;
ALTER TABLE mouvements ADD COLUMN IF NOT EXISTS modif_le TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());
ALTER TABLE mouvements ADD COLUMN IF NOT EXISTS modif_par TEXT;

COMMIT;

-- ── Exemple INSERT ────────────────────────────────────────────────────────────
-- INSERT INTO mouvements (
--   code_mouvement, matricule_employe, code_poste, type_mouvement, date_mouvement, document_annexe, cree_par
-- ) VALUES (
--   'MVT-RH-2026-0001',
--   'RDC-0042',
--   'POSTE-RH-2026-0003',
--   'affectation',
--   '2026-04-01',
--   '/uploads/mouvements/MVT-RH-2026-0001-avenant.pdf'
-- );
