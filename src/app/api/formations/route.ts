import { NextResponse } from "next/server";
import { rowToFormationRecord } from "@/lib/formations-utils";
import { createFormationInDb, listFormationsFromDb } from "@/lib/repositories/formations";
import type { FormationParticipant } from "@/lib/types";

export async function GET() {
  try {
    const rows = await listFormationsFromDb();
    return NextResponse.json(rows.map(rowToFormationRecord));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur chargement formations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      titre?: string;
      dateDebut?: string;
      dateFin?: string;
      niveau?: string;
      instructeur?: string;
      commentaire?: string;
      participation?: unknown[];
    };

    if (!body.titre?.trim() || !body.dateDebut || !body.dateFin) {
      return NextResponse.json({ error: "Titre et dates requis" }, { status: 400 });
    }
    if (body.dateFin < body.dateDebut) {
      return NextResponse.json({ error: "La date de fin doit être après le début" }, { status: 400 });
    }

    const row = await createFormationInDb({
      titre: body.titre.trim(),
      date_debut: body.dateDebut,
      date_fin: body.dateFin,
      niveau: body.niveau?.trim() || null,
      instructeur: body.instructeur?.trim() || null,
      commentaire: body.commentaire?.trim() || null,
      participation: Array.isArray(body.participation)
        ? (body.participation as FormationParticipant[])
        : [],
    });

    return NextResponse.json(rowToFormationRecord(row), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur création formation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
