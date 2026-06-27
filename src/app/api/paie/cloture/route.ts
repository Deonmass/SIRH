import { NextResponse } from "next/server";
import { cloturerPaieMois } from "@/lib/paie-cloture";
import { getEmployees, getSettings } from "@/lib/store";
import { listPostes } from "@/lib/repositories/postes";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      moisAnnee?: string;
      matriculeEmploye?: string;
      matricules?: string[];
      createdBy?: string;
    };

    if (!body.moisAnnee?.match(/^\d{4}-\d{2}$/)) {
      return NextResponse.json({ error: "Mois (YYYY-MM) requis" }, { status: 400 });
    }

    const employees = await getEmployees();
    const [settings, positions] = await Promise.all([
      getSettings(),
      listPostes(employees),
    ]);

    const matricules = body.matriculeEmploye
      ? [body.matriculeEmploye]
      : body.matricules;

    const result = await cloturerPaieMois({
      employees,
      positions,
      moisAnnee: body.moisAnnee,
      settings,
      createdBy: body.createdBy ?? "hr-admin",
      matricules,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur clôture paie";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
