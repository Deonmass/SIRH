import { NextResponse } from "next/server";
import { getEmployee, saveEmployee } from "@/lib/store";
import { deleteEmployeeDocumentFile } from "@/lib/supabase";
import type { DocumentItem } from "@/lib/types";

function clearedDocument(doc: DocumentItem): DocumentItem {
  return {
    ...doc,
    received: false,
    receivedAt: undefined,
    fileRef: undefined,
    fileName: undefined,
    fileSize: undefined,
    uploadedAt: undefined,
    expiryDate: undefined,
  };
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) {
    return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "documentId requis" }, { status: 400 });
  }

  const existingDoc = employee.documents.find((d) => d.id === documentId);
  if (!existingDoc) {
    return NextResponse.json({ error: "Rubrique document introuvable" }, { status: 400 });
  }

  try {
    if (existingDoc.fileRef) {
      await deleteEmployeeDocumentFile(existingDoc.fileRef).catch(() => undefined);
    }

    const documents = employee.documents.map((d) =>
      d.id === documentId ? clearedDocument(d) : d
    );
    const updated = await saveEmployee({ ...employee, documents });

    return NextResponse.json({
      document: documents.find((d) => d.id === documentId),
      employee: updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
