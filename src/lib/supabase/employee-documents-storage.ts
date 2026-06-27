import { createSupabaseServiceClient } from "./server";
import {
  EMPLOYEE_DOCUMENTS_BUCKET,
  buildEmployeeDocumentObjectPath,
  buildEmployeeDocumentStorageRef,
  parseEmployeeDocumentStorageRef,
} from "./employee-documents-storage-ref";

export {
  EMPLOYEE_DOCUMENTS_BUCKET,
  buildEmployeeDocumentStorageRef,
  parseEmployeeDocumentStorageRef,
  isEmployeeDocumentStorageRef,
  buildEmployeeDocumentObjectPath,
} from "./employee-documents-storage-ref";

export async function uploadEmployeeDocumentFile(input: {
  employeeId: string;
  employeeDisplayName: string;
  documentId: string;
  documentLabel: string;
  file: File | Blob;
  fileName: string;
  contentType?: string;
}): Promise<{ storageRef: string; objectPath: string }> {
  const supabase = createSupabaseServiceClient();
  const objectPath = buildEmployeeDocumentObjectPath({
    employeeId: input.employeeId,
    employeeDisplayName: input.employeeDisplayName,
    documentLabel: input.documentLabel,
    originalFileName: input.fileName,
  });
  const buffer = Buffer.from(await input.file.arrayBuffer());

  const { error } = await supabase.storage
    .from(EMPLOYEE_DOCUMENTS_BUCKET)
    .upload(objectPath, buffer, {
      contentType: input.contentType || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    throw new Error(`Échec upload Supabase : ${error.message}`);
  }

  return {
    objectPath,
    storageRef: buildEmployeeDocumentStorageRef(objectPath),
  };
}

export async function deleteEmployeeDocumentFile(fileRef?: string | null): Promise<void> {
  const parsed = fileRef ? parseEmployeeDocumentStorageRef(fileRef) : null;
  if (!parsed) return;

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);
  if (error) {
    throw new Error(`Échec suppression Supabase : ${error.message}`);
  }
}

export async function createEmployeeDocumentSignedUrl(
  fileRef: string,
  expiresInSeconds = 3600
): Promise<string> {
  const parsed = parseEmployeeDocumentStorageRef(fileRef);
  if (!parsed) {
    throw new Error("Référence de fichier Supabase invalide");
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "URL signée indisponible");
  }

  return data.signedUrl;
}

export async function downloadEmployeeDocumentFile(
  fileRef: string
): Promise<{ blob: Blob; contentType: string }> {
  const parsed = parseEmployeeDocumentStorageRef(fileRef);
  if (!parsed) {
    throw new Error("Référence de fichier Supabase invalide");
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.path);

  if (error || !data) {
    throw new Error(error?.message ?? "Fichier introuvable dans Supabase");
  }

  return {
    blob: data,
    contentType: data.type || "application/octet-stream",
  };
}
