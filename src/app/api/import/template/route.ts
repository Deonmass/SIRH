import { NextResponse } from "next/server";
import { buildImportTemplate, templateFilename } from "@/lib/excel-import/template";
import type { ImportKind } from "@/lib/excel-import/types";

export const dynamic = "force-dynamic";

const VALID: ImportKind[] = ["employes", "postes", "complet"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("kind") ?? "complet";
    const kind = VALID.includes(raw as ImportKind) ? (raw as ImportKind) : "complet";

    const buffer = await buildImportTemplate(kind);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${templateFilename(kind)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Génération du modèle Excel impossible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
