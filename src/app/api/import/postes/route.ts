import { NextResponse } from "next/server";
import { importPosteRow } from "@/lib/excel-import/import-service";
import type { PosteImportRow } from "@/lib/excel-import/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PosteImportRow;
    const position = await importPosteRow(body);
    return NextResponse.json(
      {
        ok: true,
        id: position.id,
        code: position.code,
        label: position.title,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import poste impossible.";
    const status =
      message.includes("déjà utilisé") || message.includes("introuvable") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
