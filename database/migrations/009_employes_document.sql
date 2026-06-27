-- =============================================================================
-- Migration 009 — DOCUMENTS JSONB sur EMPLOYES
-- =============================================================================
-- Checklist RH par employé (réception, fichiers, échéances) en JSON.
-- =============================================================================

BEGIN;

ALTER TABLE public.employes
  ADD COLUMN IF NOT EXISTS document JSONB NOT NULL DEFAULT '{"items":[]}'::jsonb;

COMMENT ON COLUMN public.employes.document IS
  'Checklist documents RH (items JSON : id, label, requis, recu, fichier_ref, …).';

CREATE INDEX IF NOT EXISTS idx_employes_document_gin ON public.employes USING gin (document);

COMMIT;
