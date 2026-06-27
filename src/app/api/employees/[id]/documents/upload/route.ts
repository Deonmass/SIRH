import { NextResponse } from "next/server";
import { getEmployee, saveEmployee } from "@/lib/store";
import {
  deleteEmployeeDocumentFile,
  isSupabaseStorageConfigured,
  uploadEmployeeDocumentFile,
} from "@/lib/supabase";

const MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function isAllowedFile(file: File): boolean {
  return (
    ALLOWED_TYPES.includes(file.type) ||
    Boolean(file.name.match(/\.(pdf|jpe?g|png|webp|docx?)$/i))
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stockage Supabase non configuré. Ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local et créez le bucket document_admin_employe.",
      },
      { status: 503 }
    );
  }

  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) {
    return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const documentId = formData.get("documentId") as string | null;

  if (!file || !documentId) {
    return NextResponse.json({ error: "Fichier ou document manquant" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  }

  if (!isAllowedFile(file)) {
    return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 400 });
  }

  const existingDoc = employee.documents.find((d) => d.id === documentId);
  if (!existingDoc) {
    return NextResponse.json({ error: "Rubrique document introuvable" }, { status: 400 });
  }

  try {
    if (existingDoc.fileRef) {
      await deleteEmployeeDocumentFile(existingDoc.fileRef).catch(() => undefined);
    }

    const employeeDisplayName = `${employee.prenom} ${employee.nom}`.trim() || employee.matricule;

    const { storageRef } = await uploadEmployeeDocumentFile({
      employeeId: id,
      employeeDisplayName,
      documentId,
      documentLabel: existingDoc.label,
      file,
      fileName: file.name,
      contentType: file.type || undefined,
    });

    const documents = employee.documents.map((d) =>
      d.id === documentId
        ? {
            ...d,
            received: true,
            receivedAt: new Date().toISOString(),
            fileRef: storageRef,
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
          }
        : d
    );

    const updated = await saveEmployee({ ...employee, documents });
    return NextResponse.json({
      document: documents.find((d) => d.id === documentId),
      employee: updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
