import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getUtilisateur } from "@/lib/auth/users";
import {
  canCreatePointageDay,
  canModifyRecordedPointageDay,
  pointagePayloadModifiesPersistedDays,
} from "@/lib/pointage-access";
import { pointageIdFromApp, parsePointagePayload, rowToPointageRecord } from "@/lib/pointage-utils";
import {
  fullPermissionMatrix,
  isAdminUsername,
  normalizePermissionMatrix,
} from "@/lib/permissions";
import {
  deletePointageInDb,
  getPointageById,
  upsertPointageInDb,
} from "@/lib/repositories/pointage";
import type { DbPointageJourJson } from "../../../../../database/migrations/019_pointage_table.types";

async function sessionPermissions() {
  const session = await getSessionUser();
  if (!session) return { session: null, permissions: {} };
  const fresh = await getUtilisateur(String(session.id));
  const permissions =
    fresh && isAdminUsername(fresh.username)
      ? fullPermissionMatrix()
      : normalizePermissionMatrix(fresh?.permissions ?? session.permissions);
  return { session, permissions };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = await getPointageById(pointageIdFromApp(id));
    if (!row) return NextResponse.json({ error: "Feuille introuvable" }, { status: 404 });
    return NextResponse.json(rowToPointageRecord(row));
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
    const { session, permissions } = await sessionPermissions();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const numericId = pointageIdFromApp(id);
    const existing = await getPointageById(numericId);
    if (!existing) return NextResponse.json({ error: "Feuille introuvable" }, { status: 404 });

    const body = (await request.json()) as {
      jours?: DbPointageJourJson[];
      verrouille?: boolean;
      commentaireMois?: string | null;
    };

    const existingPayload = parsePointagePayload(existing.pointage);
    const nextJours = body.jours ?? existingPayload.jours;

    if (!canCreatePointageDay(permissions, session.username)) {
      return NextResponse.json({ error: "Permission insuffisante pour saisir le pointage" }, { status: 403 });
    }
    if (
      pointagePayloadModifiesPersistedDays(existingPayload.jours, nextJours) &&
      !canModifyRecordedPointageDay(permissions, session.username)
    ) {
      return NextResponse.json(
        { error: "Permission insuffisante pour modifier un jour déjà enregistré" },
        { status: 403 }
      );
    }

    const row = await upsertPointageInDb({
      matricul_employe: existing.matricul_employe,
      mois_annee: existing.mois_annee,
      jours: nextJours,
      verrouille: body.verrouille ?? existingPayload.verrouille,
      commentaire_mois:
        body.commentaireMois !== undefined ? body.commentaireMois : existingPayload.commentaire_mois,
    });

    return NextResponse.json(rowToPointageRecord(row));
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
    const ok = await deletePointageInDb(pointageIdFromApp(id));
    if (!ok) return NextResponse.json({ error: "Feuille introuvable" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur suppression";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
