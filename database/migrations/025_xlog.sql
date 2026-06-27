-- =============================================================================
-- Migration 025 — Journal d'activité (xlog)
-- =============================================================================
-- Historique des actions utilisateurs avec possibilité d'annulation.
-- Colonnes alignées sur le modèle métier (snake_case pour Supabase/PostgREST).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public."Xlog" (
  id              SERIAL PRIMARY KEY,
  utilisateur     TEXT,
  action          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by      TEXT,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT,
  entity_label    TEXT,
  summary         TEXT NOT NULL,
  payload_before  JSONB,
  payload_after   JSONB,
  undone_at       TIMESTAMPTZ,
  undone_by       TEXT
);

COMMENT ON TABLE public."Xlog" IS 'Journal d''activité SIRH — insertions, modifications, suppressions, désactivations…';
COMMENT ON COLUMN public."Xlog".utilisateur IS 'Compte ayant effectué l''action';
COMMENT ON COLUMN public."Xlog".action IS 'insertion | modification | suppression | desactivation | activation | connexion | annulation';
COMMENT ON COLUMN public."Xlog".entity_type IS 'employe | utilisateur | departement | poste | conge | formation | mouvement | configuration';
COMMENT ON COLUMN public."Xlog".payload_before IS 'État avant l''action (pour annulation)';
COMMENT ON COLUMN public."Xlog".payload_after IS 'État après l''action';
COMMENT ON COLUMN public."Xlog".undone_at IS 'Horodatage si l''action a été annulée';

CREATE INDEX IF NOT EXISTS idx_xlog_created_at ON public."Xlog" (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xlog_utilisateur ON public."Xlog" (utilisateur);
CREATE INDEX IF NOT EXISTS idx_xlog_action ON public."Xlog" (action);
CREATE INDEX IF NOT EXISTS idx_xlog_entity ON public."Xlog" (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_xlog_undone ON public."Xlog" (undone_at) WHERE undone_at IS NULL;

COMMIT;
