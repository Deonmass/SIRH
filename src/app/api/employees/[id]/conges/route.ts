import { NextResponse } from "next/server";
import { getEmployeById } from "@/lib/repositories/employes";
import {
  employeeHasLinkedPoste,
  getEmployeeCongesFromSoldeColumn,
  saveCongeForEmployee,
} from "@/lib/store";
import type { LeaveType } from "@/lib/types";

/** Historique : `employes.conges` · soldes : `employes.solde_conge`. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const row = await getEmployeById(id);
  if (!row) {
    return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
  }

  if (!(await employeeHasLinkedPoste(id))) {
    return NextResponse.json({
      conges: [],
      leaveBalance: null,
      source: "employes.conges" as const,
      skipped: "no_poste" as const,
    });
  }

  const payload = await getEmployeeCongesFromSoldeColumn(id);
  return NextResponse.json({
    conges: payload?.conges ?? [],
    leaveBalance: payload?.leaveBalance ?? null,
    source: "employes.conges" as const,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    const row = await getEmployeById(id);
    if (!row) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }
    if (!(await employeeHasLinkedPoste(id))) {
      return NextResponse.json(
        { error: "Aucune fiche de poste liée — congés indisponibles." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      id?: string;
      type?: LeaveType;
      startDate?: string;
      endDate?: string;
      notes?: string;
      validateur1?: string | null;
      validateur2?: string | null;
    };

    if (!body.startDate || !body.endDate || !body.type) {
      return NextResponse.json({ error: "Type et dates requis" }, { status: 400 });
    }

    const saved = await saveCongeForEmployee(id, {
      id: body.id,
      type: body.type,
      startDate: body.startDate,
      endDate: body.endDate,
      notes: body.notes,
      validateur1: body.validateur1,
      validateur2: body.validateur2,
      status: "demande",
    });

    const payload = await getEmployeeCongesFromSoldeColumn(id);
    return NextResponse.json({
      conge: saved,
      conges: payload?.conges ?? [],
      leaveBalance: payload?.leaveBalance ?? null,
      source: "employes.conges" as const,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur enregistrement";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
