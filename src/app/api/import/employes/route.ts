import { NextResponse } from "next/server";
import { importEmployeRow } from "@/lib/excel-import/import-service";
import type { EmployeImportRow } from "@/lib/excel-import/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EmployeImportRow;
    const employee = await importEmployeRow(body);
    return NextResponse.json(
      {
        ok: true,
        id: employee.id,
        matricule: employee.matricule,
        label: `${employee.prenom} ${employee.nom}`.trim(),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import employé impossible.";
    const status = message.includes("déjà utilisé") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
