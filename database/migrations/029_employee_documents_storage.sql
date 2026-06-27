-- Bucket privé pour les pièces du dossier employé (admin RH).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('document_admin_employe', 'document_admin_employe', false, 10485760)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;
