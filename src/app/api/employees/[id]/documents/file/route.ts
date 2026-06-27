import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/store";
import {
  downloadEmployeeDocumentFile,
  isEmployeeDocumentStorageRef,
} from "@/lib/supabase";

function mimeFromFileName(fileName?: string | null): string {
  const name = fileName ?? "";
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.jpe?g$/i.test(name)) return "image/jpeg";
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.webp$/i.test(name)) return "image/webp";
  if (/\.docx$/i.test(name)) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (/\.doc$/i.test(name)) return "application/msword";
  return "application/octet-stream";
}

function inlineFileName(fileName?: string | null): string {
  const safe = (fileName ?? "document").replace(/[^\w.\-() ]+/g, "_");
  return safe || "document";
}

export async function GET(
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

  const doc = employee.documents.find((d) => d.id === documentId);
  if (!doc?.fileRef) {
    return NextResponse.json({ error: "Aucun fichier pour ce document" }, { status: 404 });
  }

  const contentType = mimeFromFileName(doc.fileName ?? doc.fileRef);
  const disposition = `inline; filename="${inlineFileName(doc.fileName)}"`;

  try {
    if (isEmployeeDocumentStorageRef(doc.fileRef)) {
      const { blob, contentType: storageType } = await downloadEmployeeDocumentFile(doc.fileRef);
      const buffer = Buffer.from(await blob.arrayBuffer());
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": storageType !== "application/octet-stream" ? storageType : contentType,
          "Content-Disposition": disposition,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    if (doc.fileRef.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", doc.fileRef);
      const buffer = await fs.readFile(filePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": disposition,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    if (doc.fileRef.startsWith("http://") || doc.fileRef.startsWith("https://")) {
      return NextResponse.redirect(doc.fileRef);
    }

    return NextResponse.json({ error: "Référence de fichier non supportée" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Impossible de lire le fichier";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
