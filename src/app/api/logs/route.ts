import { NextResponse } from "next/server";
import {
  listActivityLogs,
  listActivityLogUsers,
  sanitizeLogForApi,
} from "@/lib/activity-log";
import { requirePermission } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission("utilisateurs.logs", "read");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const utilisateur = searchParams.get("utilisateur") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const usersOnly = searchParams.get("users") === "1";

  if (usersOnly) {
    const users = await listActivityLogUsers();
    return NextResponse.json({ users });
  }

  const logs = await listActivityLogs({
    utilisateur,
    from,
    to,
    limit: 500,
  });

  return NextResponse.json(logs.map(sanitizeLogForApi));
}
