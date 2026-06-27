import { NextResponse } from "next/server";
import { validateEmployeeKindFields } from "@/lib/employee-kind";
import { deleteEmployee, getEmployee, saveEmployee } from "@/lib/store";
import type { EmployeeKind } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const employee = await getEmployee(id);
  if (!employee) {
    return NextResponse.json(
      {
        error:
          "Employé introuvable. Rechargez la page (F5) puis sélectionnez à nouveau l'agent.",
      },
      { status: 404 }
    );
  }
  return NextResponse.json(employee);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    const existing = await getEmployee(id);
    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Employé introuvable. Rechargez la page (F5) puis sélectionnez à nouveau l'agent dans la liste.",
        },
        { status: 404 }
      );
    }
    const body = await request.json();
    const merged = { ...existing, ...body, id };
    const employeeKind = (merged.employeeKind as EmployeeKind) ?? "interne";
    const kindError = validateEmployeeKindFields(
      employeeKind,
      merged.subcontractorId,
      merged.journalierProviderId
    );
    if (kindError) {
      return NextResponse.json({ error: kindError }, { status: 400 });
    }
    const updated = await saveEmployee(merged);
    return NextResponse.json(updated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'employé.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const ok = await deleteEmployee(id);
  if (!ok) {
    return NextResponse.json(
      {
        error:
          "Employé introuvable ou déjà supprimé. Rechargez la page (F5) puis réessayez.",
      },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
