import { NextResponse } from "next/server";
import { sanitizeLogForApi, undoActivity } from "@/lib/activity-log";
import { requirePermission } from "@/lib/auth/require-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requirePermission("utilisateurs.logs", "write");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const entry = await undoActivity(id, auth.user.username);
    return NextResponse.json(sanitizeLogForApi(entry));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Annulation impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
