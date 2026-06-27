import { NextResponse } from "next/server";
import { serializeMovementAttachments } from "@/lib/movement-attachments";
import { addMovement, getEmployeeForMutation, getPosition } from "@/lib/store";
import type { EmployeeExtraCosts, MovementType } from "@/lib/types";
import { typeMouvementRequiertPoste } from "../../../../database/migrations/004_mouvements.types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") ?? "";
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId requis" }, { status: 400 });
  }
  const employee = await getEmployeeForMutation(employeeId);
  if (!employee) return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 });
  return NextResponse.json(employee.movements);
}

export async function POST(request: Request) {
  const body = await request.json();
  const employeeId = String(body.employeeId ?? "");
  if (!employeeId) {
    return NextResponse.json({ error: "Employé requis" }, { status: 400 });
  }

  const employee = await getEmployeeForMutation(employeeId);
  if (!employee) return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 });

  const movementType = (body.type as MovementType) ?? "changement_poste";

  if (movementType === "desaffectation") {
    if (!employee.positionId) {
      return NextResponse.json(
        { error: "L'employé n'est affecté à aucun poste" },
        { status: 400 }
      );
    }
    const currentPosition = await getPosition(employee.positionId);
    const date = body.date ?? new Date().toISOString().split("T")[0];
    const reason =
      String(body.reason ?? "").trim() ||
      `Désaffectation du poste ${currentPosition?.title ?? employee.position ?? ""}`.trim();

    const result = await addMovement(employeeId, {
      type: "desaffectation",
      date,
      fromPosition: employee.position ?? currentPosition?.title,
      fromDepartment: employee.department,
      fromSalary: employee.salary?.baseSalary,
      positionCode: null,
      reason,
      legalBasis: body.legalBasis ?? "Désaffectation",
      approvedBy: body.approvedBy,
      effectiveDate: body.effectiveDate ?? date,
      documentAnnexe:
        serializeMovementAttachments(
          Array.isArray(body.documentAnnexes) ? body.documentAnnexes : []
        ) ??
        (body.documentAnnexe?.trim() || null),
      createdBy: body.createdBy ?? null,
    });

    if (!result) return NextResponse.json({ error: "Erreur" }, { status: 500 });

    return NextResponse.json(
      { movement: result.movement, employee: result.employee },
      { status: 201 }
    );
  }

  const positionCode = body.positionCode?.trim() || null;
  const targetPosition =
    body.positionId && !positionCode
      ? await getPosition(String(body.positionId))
      : null;
  if (body.positionId && !positionCode && !targetPosition) {
    return NextResponse.json({ error: "Fiche de poste introuvable" }, { status: 404 });
  }

  if (typeMouvementRequiertPoste(movementType) && !targetPosition && !positionCode) {
    return NextResponse.json({ error: "Poste cible requis pour ce type de mouvement" }, { status: 400 });
  }

  const toPosition = targetPosition?.title ?? body.toPosition;
  const toDepartment = targetPosition?.department ?? body.toDepartment;
  const toSalary = targetPosition?.payroll.baseSalary ?? body.toSalary;
  const reason =
    String(body.reason ?? "").trim() ||
    (targetPosition
      ? `Changement de poste vers ${targetPosition.title}`
      : "Mouvement enregistré");

  const result = await addMovement(employeeId, {
    type: movementType,
    date: body.date ?? new Date().toISOString().split("T")[0],
    fromPosition: body.fromPosition ?? employee.position,
    toPosition,
    fromDepartment: body.fromDepartment ?? employee.department,
    toDepartment,
    fromSalary: body.fromSalary ?? employee.salary.baseSalary,
    toSalary,
    reason,
    legalBasis: body.legalBasis ?? "Changement de poste",
    approvedBy: body.approvedBy,
    effectiveDate: body.effectiveDate ?? body.date ?? new Date().toISOString().split("T")[0],
    positionCode: positionCode ?? targetPosition?.code ?? null,
    extraCosts: body.extraCosts as EmployeeExtraCosts | undefined,
    documentAnnexe:
      serializeMovementAttachments(
        Array.isArray(body.documentAnnexes) ? body.documentAnnexes : []
      ) ??
      (body.documentAnnexe?.trim() || null),
    createdBy: body.createdBy ?? null,
  });

  if (!result) return NextResponse.json({ error: "Erreur" }, { status: 500 });

  return NextResponse.json(
    { movement: result.movement, employee: result.employee },
    { status: 201 }
  );
}
