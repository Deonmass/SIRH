import { NextResponse } from "next/server";
import {
  listOvertimeMonthlyForEmployee,
  saveOvertimeMonthlyRecord,
} from "@/lib/store";
import { currentMoisAnnee, normalizeMoisAnnee } from "@/lib/employes-overtime-json";
import type { OvertimeMonthlyRecord, WorkMonthMode } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const records = await listOvertimeMonthlyForEmployee(id);
  return NextResponse.json(records);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    const body = (await request.json()) as Partial<OvertimeMonthlyRecord>;

    const moisAnnee = normalizeMoisAnnee(body.moisAnnee ?? currentMoisAnnee());
    if (!moisAnnee) {
      return NextResponse.json({ error: "Mois invalide (YYYY-MM)" }, { status: 400 });
    }

    const record = await saveOvertimeMonthlyRecord(id, {
      moisAnnee,
      hours130: Number(body.hours130) || 0,
      hours160: Number(body.hours160) || 0,
      hours200: Number(body.hours200) || 0,
      workMonthMode:
        body.workMonthMode === 22 || body.workMonthMode === 26
          ? body.workMonthMode
          : undefined,
      notes: body.notes?.trim() || undefined,
    });

    if (!record) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }

    const records = await listOvertimeMonthlyForEmployee(id);
    return NextResponse.json({ record, records }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur lors de l'enregistrement des heures sup.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
