import { NextResponse } from "next/server";
import { listAllConges, saveCongeForEmployee } from "@/lib/store";
import type { LeaveRequestStatus, LeaveType } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statut = searchParams.get("statut") as LeaveRequestStatus | null;
  let conges = await listAllConges();
  if (statut) {
    conges = conges.filter((c) => c.status === statut);
  }
  return NextResponse.json(conges);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      employeeId?: string;
      type?: LeaveType;
      startDate?: string;
      endDate?: string;
      notes?: string;
      validateur1?: string | null;
      validateur2?: string | null;
    };
    if (!body.employeeId?.trim()) {
      return NextResponse.json({ error: "Employé requis" }, { status: 400 });
    }
    if (!body.startDate || !body.endDate) {
      return NextResponse.json({ error: "Dates requises" }, { status: 400 });
    }
    if (!body.type) {
      return NextResponse.json({ error: "Type de congé requis" }, { status: 400 });
    }

    const saved = await saveCongeForEmployee(body.employeeId, {
      type: body.type,
      startDate: body.startDate,
      endDate: body.endDate,
      notes: body.notes,
      validateur1: body.validateur1,
      validateur2: body.validateur2,
      status: "demande",
    });

    if (!saved) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }
    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur enregistrement congé";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
