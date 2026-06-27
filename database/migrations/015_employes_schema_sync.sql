-- Migration 015 — alignement schéma employes (colonnes JSON / TEXT manquantes)
-- Exécuter sur Supabase si des erreurs "schema cache" apparaissent.

BEGIN;

ALTER TABLE public.employes
  ADD COLUMN IF NOT EXISTS statut TEXT;

ALTER TABLE public.employes
  ADD COLUMN IF NOT EXISTS mouvement JSONB NOT NULL DEFAULT '{"historique":[]}'::jsonb;

ALTER TABLE public.employes
  ADD COLUMN IF NOT EXISTS coordonnees JSONB NOT NULL DEFAULT '{"historique":[]}'::jsonb;

ALTER TABLE public.employes
  ADD COLUMN IF NOT EXISTS document JSONB NOT NULL DEFAULT '{"items":[]}'::jsonb;

ALTER TABLE public.employes
  ADD COLUMN IF NOT EXISTS solde_conge TEXT;

ALTER TABLE public.employes
  ADD COLUMN IF NOT EXISTS conges TEXT;

ALTER TABLE public.employes
  ADD COLUMN IF NOT EXISTS discipline TEXT;

CREATE INDEX IF NOT EXISTS idx_employes_statut ON public.employes(statut);
CREATE INDEX IF NOT EXISTS idx_employes_mouvement_gin ON public.employes USING gin (mouvement);
CREATE INDEX IF NOT EXISTS idx_employes_coordonnees_gin ON public.employes USING gin (coordonnees);
CREATE INDEX IF NOT EXISTS idx_employes_document_gin ON public.employes USING gin (document);

COMMIT;
