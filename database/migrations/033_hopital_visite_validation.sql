-- =============================================================================
-- Migration 033 — Validation visites + bucket pièces jointes santé
-- =============================================================================

BEGIN;

ALTER TABLE public.hopital_visite
  ADD COLUMN IF NOT EXISTS validation text;

COMMENT ON COLUMN public.hopital_visite.validation IS 'en_attente | valide | rejete';

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('sante_visite_documents', 'sante_visite_documents', false, 10485760)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit;

COMMIT;
