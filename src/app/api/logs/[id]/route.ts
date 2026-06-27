import { NextResponse } from "next/server";
import { deleteActivityLog, getActivityLog, sanitizeLogForApi } from "@/lib/activity-log";
import { requirePermission } from "@/lib/auth/require-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePermission("utilisateurs.logs", "read");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const entry = await getActivityLog(id);
  if (!entry) {
    return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });
  }
  return NextResponse.json(sanitizeLogForApi(entry));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requirePermission("utilisateurs.logs", "delete");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const ok = await deleteActivityLog(id);
    if (!ok) {
      return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Suppression impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
