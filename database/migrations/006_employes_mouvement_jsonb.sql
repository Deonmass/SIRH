-- =============================================================================
-- Migration 006 — MOUVEMENT JSONB sur EMPLOYES
-- =============================================================================
-- Remplace la table `mouvements` : journal stocké dans employes.mouvement (JSONB).
-- Le poste actuel = dernier mouvement (date la plus récente) avec code_poste.
-- =============================================================================

BEGIN;

ALTER TABLE employes
  ADD COLUMN IF NOT EXISTS mouvement JSONB NOT NULL DEFAULT '{"historique":[]}'::jsonb;

COMMENT ON COLUMN employes.mouvement IS
  'Journal des mouvements RH (historique JSON). Le plus récent avec code_poste = poste actuel.';

CREATE INDEX IF NOT EXISTS idx_employes_mouvement_gin ON employes USING gin (mouvement);

COMMIT;
