import { NextResponse } from "next/server";
import { rowToPaieRecord } from "@/lib/paie-utils";
import { getPaieByMatriculeMois, listPaieFromDb } from "@/lib/repositories/paie";
import { getEmployees } from "@/lib/store";
import type { PaieListRow } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mois = searchParams.get("mois") ?? undefined;
    const matricule = searchParams.get("matricule") ?? undefined;

    if (matricule && mois) {
      const row = await getPaieByMatriculeMois(matricule, mois);
      if (!row) return NextResponse.json(null);
      return NextResponse.json(rowToPaieRecord(row));
    }

    const employees = await getEmployees();
    const byMat = new Map(employees.map((e) => [e.matricule, e]));
    const rows = await listPaieFromDb(mois, matricule);
    const list: PaieListRow[] = rows.map((row) => {
      const rec = rowToPaieRecord(row);
      const emp = byMat.get(rec.matriculeEmploye);
      return {
        ...rec,
        employeId: emp?.id,
        nom: emp?.nom,
        prenom: emp?.prenom,
        departement: emp?.department,
      };
    });
    return NextResponse.json(list);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur chargement paie";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
