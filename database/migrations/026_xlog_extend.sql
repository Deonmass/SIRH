-- =============================================================================
-- Migration 026 — Extension table public."Xlog"
-- =============================================================================
-- Aligne le schéma Supabase sur le nom de table métier "Xlog" et ajoute
-- les colonnes nécessaires (annulation, entités, payloads JSON).
-- =============================================================================

BEGIN;

-- Renommer les colonnes legacy (typos / espaces) si elles existent
DO $$ BEGIN
  ALTER TABLE public."Xlog" RENAME COLUMN "utlisateur" TO utilisateur;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public."Xlog" RENAME COLUMN "created at" TO created_at;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public."Xlog" RENAME COLUMN "created by" TO created_by;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

-- Créer la table si elle n'existe pas encore
CREATE TABLE IF NOT EXISTS public."Xlog" (
  id              SERIAL PRIMARY KEY,
  utilisateur     TEXT,
  action          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by      TEXT
);

-- Colonnes complémentaires pour le journal + annulation
ALTER TABLE public."Xlog"
  ADD COLUMN IF NOT EXISTS utilisateur TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS entity_label TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS payload_before JSONB,
  ADD COLUMN IF NOT EXISTS payload_after JSONB,
  ADD COLUMN IF NOT EXISTS undone_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS undone_by TEXT,
  ADD COLUMN IF NOT EXISTS details JSONB;

UPDATE public."Xlog"
SET summary = action
WHERE summary IS NULL AND action IS NOT NULL;

UPDATE public."Xlog"
SET entity_type = 'configuration'
WHERE entity_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_xlog_created_at ON public."Xlog" (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xlog_utilisateur ON public."Xlog" (utilisateur);
CREATE INDEX IF NOT EXISTS idx_xlog_action ON public."Xlog" (action);
CREATE INDEX IF NOT EXISTS idx_xlog_entity ON public."Xlog" (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_xlog_undone ON public."Xlog" (undone_at) WHERE undone_at IS NULL;

COMMIT;
