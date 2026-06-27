import { NextResponse } from "next/server";
import { formationIdFromApp, rowToFormationRecord } from "@/lib/formations-utils";
import {
  deleteFormationInDb,
  getFormationById,
  updateFormationInDb,
} from "@/lib/repositories/formations";
import type { FormationParticipant } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = await getFormationById(formationIdFromApp(id));
    if (!row) return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });
    return NextResponse.json(rowToFormationRecord(row));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = formationIdFromApp(id);
    const existing = await getFormationById(numericId);
    if (!existing) return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });

    const body = (await request.json()) as {
      titre?: string;
      dateDebut?: string;
      dateFin?: string;
      niveau?: string | null;
      instructeur?: string | null;
      commentaire?: string | null;
      participation?: FormationParticipant[];
    };

    const date_debut = body.dateDebut ?? existing.date_debut;
    const date_fin = body.dateFin ?? existing.date_fin;
    if (date_fin < date_debut) {
      return NextResponse.json({ error: "La date de fin doit être après le début" }, { status: 400 });
    }

    const row = await updateFormationInDb(numericId, {
      titre: body.titre?.trim() ?? existing.titre,
      date_debut,
      date_fin,
      niveau: body.niveau !== undefined ? body.niveau : existing.niveau,
      instructeur: body.instructeur !== undefined ? body.instructeur : existing.instructeur,
      commentaire: body.commentaire !== undefined ? body.commentaire : existing.commentaire,
      participation: body.participation ?? existing.participation,
    });

    return NextResponse.json(rowToFormationRecord(row));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur mise à jour";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = formationIdFromApp(id);
    const ok = await deleteFormationInDb(numericId);
    if (!ok) return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur suppression";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
