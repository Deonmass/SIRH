-- Ajout du type de mouvement « desaffectation »
BEGIN;

DO $$ BEGIN
  ALTER TYPE type_mouvement ADD VALUE IF NOT EXISTS 'desaffectation' AFTER 'affectation';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
