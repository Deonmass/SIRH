import { NextResponse } from "next/server";
import {
  deleteConge,
  getEmployees,
  listAllConges,
  saveCongeForEmployee,
  updateCongeStatus,
  validateCongeLevel,
} from "@/lib/store";
import { assertCongeValidationAllowed } from "@/lib/conges-validation-access";
import { requireAuth } from "@/lib/auth/require-auth";
import type { LeaveRequestStatus, LeaveType } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = (await request.json()) as {
      action?: "validate";
      validatorId?: string;
      level?: 1 | 2;
      status?: LeaveRequestStatus;
      notes?: string;
      type?: LeaveType;
      startDate?: string;
      endDate?: string;
      validateur1?: string | null;
      validateur2?: string | null;
      employeeId?: string;
    };

    if (body.action === "validate") {
      const level = body.level ?? 1;
      const all = await listAllConges();
      const existing = all.find((c) => c.id === id);
      if (!existing) {
        return NextResponse.json({ error: "Congé introuvable" }, { status: 404 });
      }

      const employees = await getEmployees();
      const check = assertCongeValidationAllowed({
        username: auth.user.username,
        permissions: auth.user.permissions,
        matriculAgent: auth.user.matriculAgent,
        employees,
        conge: existing,
        level,
      });
      if (!check.ok) {
        return NextResponse.json({ error: check.reason }, { status: 403 });
      }

      const updated = await validateCongeLevel(id, String(auth.user.id), level);
      if (!updated) {
        return NextResponse.json({ error: "Congé introuvable" }, { status: 404 });
      }
      return NextResponse.json(updated);
    }

    if (body.status && !body.type) {
      const updated = await updateCongeStatus(id, body.status, body.notes);
      if (!updated) {
        return NextResponse.json({ error: "Congé introuvable" }, { status: 404 });
      }
      return NextResponse.json(updated);
    }

    const all = await listAllConges();
    const existing = all.find((c) => c.id === id);
    if (!existing?.employeeId) {
      return NextResponse.json({ error: "Congé introuvable" }, { status: 404 });
    }

    const saved = await saveCongeForEmployee(existing.employeeId, {
      id,
      type: body.type ?? existing.type,
      startDate: body.startDate ?? existing.startDate,
      endDate: body.endDate ?? existing.endDate,
      status: body.status ?? existing.status,
      notes: body.notes ?? existing.notes,
      validateur1: body.validateur1 ?? existing.validateur1,
      validateur2: body.validateur2 ?? existing.validateur2,
    });

    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur mise à jour";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteConge(id);
  if (!ok) {
    return NextResponse.json({ error: "Congé introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
