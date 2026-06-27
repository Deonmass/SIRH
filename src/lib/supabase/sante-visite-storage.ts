import { createSupabaseServiceClient } from "./server";
import {
  SANTE_VISITE_DOCUMENTS_BUCKET,
  buildSanteVisiteObjectPath,
  buildSanteVisiteStorageRef,
  parseSanteVisiteStorageRef,
} from "./sante-visite-storage-ref";

export async function uploadSanteVisiteFile(input: {
  visiteKey: string;
  file: File | Blob;
  fileName: string;
  contentType?: string;
}): Promise<{ storageRef: string; name: string; size: number; mimeType: string }> {
  const supabase = createSupabaseServiceClient();
  const objectPath = buildSanteVisiteObjectPath(input.visiteKey, input.fileName);
  const buffer = Buffer.from(await input.file.arrayBuffer());

  const { error } = await supabase.storage
    .from(SANTE_VISITE_DOCUMENTS_BUCKET)
    .upload(objectPath, buffer, {
      contentType: input.contentType || "application/octet-stream",
      upsert: true,
    });

  if (error) throw new Error(`Échec upload Supabase : ${error.message}`);

  return {
    storageRef: buildSanteVisiteStorageRef(objectPath),
    name: input.fileName,
    size: buffer.byteLength,
    mimeType: input.contentType || "application/octet-stream",
  };
}

export async function createSanteVisiteSignedUrl(fileRef: string): Promise<string> {
  const parsed = parseSanteVisiteStorageRef(fileRef);
  if (!parsed) throw new Error("Référence fichier invalide");

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, 3600);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "URL signée indisponible");
  }
  return data.signedUrl;
}
