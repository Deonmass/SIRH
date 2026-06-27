import { NextResponse } from "next/server";
import {
  buildVehiculeImportTemplate,
  importVehiculeRow,
  importVehiculesFromBuffer,
  vehiculeTemplateFilename,
  type VehiculeImportRow,
} from "@/lib/excel-import/vehicule-import.service";
import { requirePermission } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePermission("charroi.vehicules", "read");
  if (!auth.ok) return auth.response;

  try {
    const buffer = await buildVehiculeImportTemplate();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${vehiculeTemplateFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("charroi.vehicules", "write");
  if (!auth.ok) return auth.response;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Fichier Excel requis" }, { status: 400 });
      }
      const buffer = await file.arrayBuffer();
      const report = await importVehiculesFromBuffer(buffer);
      if (report.total === 0) {
        return NextResponse.json({ error: "Aucune ligne à importer" }, { status: 400 });
      }
      return NextResponse.json({ ok: true, ...report });
    }

    const body = (await request.json()) as VehiculeImportRow;
    if (!body.marque?.trim()) {
      return NextResponse.json({ error: "Marque requise" }, { status: 400 });
    }
    const result = await importVehiculeRow(body);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import impossible";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
