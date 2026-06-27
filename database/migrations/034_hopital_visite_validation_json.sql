-- =============================================================================
-- Migration 034 — validation JSON (statut + métadonnées validateur)
-- =============================================================================

BEGIN;

COMMENT ON COLUMN public.hopital_visite.validation IS
  'JSON: { statut, dateValidation, nomValidateur, matriculeValidateur, raisonRejet? }';

COMMIT;
