-- Migration 014 — colonne dédiée aux demandes et à l'historique de congés (JSON TEXT).
-- `solde_conge` reste réservé aux soldes (acquis / pris / restant).

ALTER TABLE public.employes
ADD COLUMN IF NOT EXISTS conges TEXT;
