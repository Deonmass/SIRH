import { NextResponse } from "next/server";
import { parseMovementAttachments, serializeMovementAttachments } from "@/lib/movement-attachments";
import { deleteMovement, getEmployee, getPosition, saveEmployee, updateMovement } from "@/lib/store";
import type { EmployeeExtraCosts, MovementType } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const employeeId = String(body.employeeId ?? "");
  if (!employeeId) {
    return NextResponse.json({ error: "Employé requis" }, { status: 400 });
  }

  const employee = await getEmployee(employeeId);
  if (!employee) return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 });

  const existing = employee.movements.find((m) => m.id === id);
  if (!existing) return NextResponse.json({ error: "Mouvement introuvable" }, { status: 404 });

  const targetPosition = body.positionId
    ? await getPosition(String(body.positionId))
    : null;
  if (body.positionId && !targetPosition) {
    return NextResponse.json({ error: "Fiche de poste introuvable" }, { status: 404 });
  }

  const reason =
    String(body.reason ?? "").trim() ||
    existing.reason ||
    "Mouvement modifié";

  const movement = await updateMovement(employeeId, id, {
    type: (body.type as MovementType) ?? existing.type,
    date: body.date ?? existing.date,
    fromPosition: body.fromPosition ?? existing.fromPosition,
    toPosition: targetPosition?.title ?? body.toPosition ?? existing.toPosition,
    fromDepartment: body.fromDepartment ?? existing.fromDepartment,
    toDepartment: targetPosition?.department ?? body.toDepartment ?? existing.toDepartment,
    fromSalary: body.fromSalary ?? existing.fromSalary,
    toSalary: targetPosition?.payroll.baseSalary ?? body.toSalary ?? existing.toSalary,
    reason,
    legalBasis: body.legalBasis ?? existing.legalBasis,
    approvedBy: body.approvedBy ?? existing.approvedBy,
    effectiveDate: body.effectiveDate ?? body.date ?? existing.effectiveDate,
    positionCode: targetPosition?.code ?? body.positionCode ?? existing.positionCode ?? null,
    extraCosts: (body.extraCosts as EmployeeExtraCosts | undefined) ?? existing.extraCosts,
    documentAnnexe:
      serializeMovementAttachments(
        Array.isArray(body.documentAnnexes)
          ? body.documentAnnexes
          : parseMovementAttachments(existing.documentAnnexe)
      ) ??
      (body.documentAnnexe?.trim() || existing.documentAnnexe || null),
    updatedBy: body.updatedBy ?? null,
  });

  if (!movement) return NextResponse.json({ error: "Erreur" }, { status: 500 });

  try {
    let updatedEmployee = (await getEmployee(employeeId))!;
    if (targetPosition) {
      updatedEmployee.positionId = targetPosition.id;
      if (body.extraCosts) {
        updatedEmployee.extraCosts = {
          ...(updatedEmployee.extraCosts ?? {}),
          ...(body.extraCosts as EmployeeExtraCosts),
          currency:
            (body.extraCosts as EmployeeExtraCosts).currency ??
            targetPosition.payroll.currency,
        };
      }
      await saveEmployee(updatedEmployee);
    } else if (body.extraCosts) {
      updatedEmployee.extraCosts = {
        ...(updatedEmployee.extraCosts ?? {}),
        ...(body.extraCosts as EmployeeExtraCosts),
      };
      await saveEmployee(updatedEmployee);
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Impossible d'appliquer le mouvement" },
      { status: 409 }
    );
  }

  const updated = await getEmployee(employeeId);
  return NextResponse.json({ movement, employee: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") ?? "";
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId requis" }, { status: 400 });
  }

  const ok = await deleteMovement(employeeId, id);
  if (!ok) return NextResponse.json({ error: "Mouvement introuvable" }, { status: 404 });
  const employee = await getEmployee(employeeId);
  return NextResponse.json({ ok: true, employee });
}
