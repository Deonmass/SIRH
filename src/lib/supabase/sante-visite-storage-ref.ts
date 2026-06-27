/** Bucket Supabase pour les pièces jointes des visites santé. */
export const SANTE_VISITE_DOCUMENTS_BUCKET = "sante_visite_documents";

const STORAGE_REF_PREFIX = `sb://${SANTE_VISITE_DOCUMENTS_BUCKET}/`;

export function buildSanteVisiteStorageRef(objectPath: string): string {
  return `${STORAGE_REF_PREFIX}${objectPath}`;
}

export function parseSanteVisiteStorageRef(
  fileRef: string
): { bucket: string; path: string } | null {
  if (!fileRef.startsWith(STORAGE_REF_PREFIX)) return null;
  return {
    bucket: SANTE_VISITE_DOCUMENTS_BUCKET,
    path: fileRef.slice(STORAGE_REF_PREFIX.length),
  };
}

export function buildSanteVisiteObjectPath(visiteId: string, originalName: string): string {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${visiteId}/${Date.now()}-${safeName}`;
}
