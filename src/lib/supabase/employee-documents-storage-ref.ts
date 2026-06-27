/** Bucket Supabase pour les pièces du dossier employé (admin RH). */
export const EMPLOYEE_DOCUMENTS_BUCKET = "document_admin_employe";

const STORAGE_REF_PREFIX = `sb://${EMPLOYEE_DOCUMENTS_BUCKET}/`;

export function sanitizeStorageSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function buildEmployeeDocumentStorageRef(objectPath: string): string {
  return `${STORAGE_REF_PREFIX}${objectPath}`;
}

export function parseEmployeeDocumentStorageRef(
  fileRef: string
): { bucket: string; path: string } | null {
  if (!fileRef.startsWith(STORAGE_REF_PREFIX)) return null;
  return {
    bucket: EMPLOYEE_DOCUMENTS_BUCKET,
    path: fileRef.slice(STORAGE_REF_PREFIX.length),
  };
}

export function isEmployeeDocumentStorageRef(fileRef?: string | null): boolean {
  return Boolean(fileRef?.startsWith(STORAGE_REF_PREFIX));
}

export function buildEmployeeDocumentObjectPath(input: {
  employeeId: string;
  employeeDisplayName: string;
  documentLabel: string;
  originalFileName: string;
}): string {
  const extMatch = input.originalFileName.match(/\.[a-z0-9]+$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : "";

  const employeeName =
    sanitizeStorageSegment(input.employeeDisplayName) ||
    sanitizeStorageSegment(input.employeeId) ||
    input.employeeId;
  const documentName =
    sanitizeStorageSegment(input.documentLabel) || sanitizeStorageSegment(input.originalFileName);

  const folder = employeeName;
  const fileName = `${employeeName}_${documentName}${ext}`;
  return `${folder}/${fileName}`;
}
