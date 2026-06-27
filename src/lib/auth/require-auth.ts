import { NextResponse } from "next/server";
import {
  canAccessSection,
  isAdminUsername,
  type PermissionAction,
} from "@/lib/permissions";
import { getSessionUser, type SessionUser } from "./session";

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

export async function requireAuth(): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

export async function requirePermission(
  sectionId: string,
  action: PermissionAction = "read"
): Promise<AuthResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;
  if (isAdminUsername(auth.user.username)) return auth;
  if (!canAccessSection(auth.user.permissions, sectionId, action, auth.user.username)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    };
  }
  return auth;
}
