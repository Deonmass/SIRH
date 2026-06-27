import { NextResponse } from "next/server";
import {
  deleteOvertimeMonthlyRecord,
  listOvertimeMonthlyForEmployee,
  saveOvertimeMonthlyRecord,
} from "@/lib/store";
import { normalizeMoisAnnee } from "@/lib/employes-overtime-json";
import type { OvertimeMonthlyRecord } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id: rawId, recordId: rawRecordId } = await params;
    const id = decodeURIComponent(rawId);
    const recordId = decodeURIComponent(rawRecordId);
    const body = (await request.json()) as Partial<OvertimeMonthlyRecord>;

    const moisAnnee = body.moisAnnee ? normalizeMoisAnnee(body.moisAnnee) : undefined;
    if (body.moisAnnee && !moisAnnee) {
      return NextResponse.json({ error: "Mois invalide (YYYY-MM)" }, { status: 400 });
    }

    const existing = (await listOvertimeMonthlyForEmployee(id)).find((r) => r.id === recordId);
    if (!existing) {
      return NextResponse.json({ error: "Enregistrement introuvable" }, { status: 404 });
    }

    const record = await saveOvertimeMonthlyRecord(id, {
      id: recordId,
      moisAnnee: moisAnnee ?? existing.moisAnnee,
      hours130: body.hours130 ?? existing.hours130,
      hours160: body.hours160 ?? existing.hours160,
      hours200: body.hours200 ?? existing.hours200,
      workMonthMode:
        body.workMonthMode === 22 || body.workMonthMode === 26
          ? body.workMonthMode
          : existing.workMonthMode,
      notes: body.notes !== undefined ? body.notes?.trim() || undefined : existing.notes,
    });

    if (!record) {
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }

    const records = await listOvertimeMonthlyForEmployee(id);
    return NextResponse.json({ record, records });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur lors de la mise à jour des heures sup.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id: rawId, recordId: rawRecordId } = await params;
    const id = decodeURIComponent(rawId);
    const recordId = decodeURIComponent(rawRecordId);

    const ok = await deleteOvertimeMonthlyRecord(id, recordId);
    if (!ok) {
      return NextResponse.json({ error: "Enregistrement introuvable" }, { status: 404 });
    }

    const records = await listOvertimeMonthlyForEmployee(id);
    return NextResponse.json({ success: true, records });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur lors de la suppression des heures sup.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
