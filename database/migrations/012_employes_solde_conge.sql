-- Migration 012 — Solde congé employé (JSON texte, art. 141 code du travail RDC)
ALTER TABLE public.employes
ADD COLUMN IF NOT EXISTS solde_conge TEXT;

COMMENT ON COLUMN public.employes.solde_conge IS
  'Solde congé JSON : acquis, pris, restant, annee, reinit_le, grade, categorie (initialisé à l''affectation)';
