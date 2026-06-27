import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-auth";
import {
  createSessionToken,
  getSessionUser,
  sessionCookieOptions,
} from "@/lib/auth/session";
import {
  deleteUtilisateur,
  getUtilisateur,
  updateUtilisateur,
} from "@/lib/auth/users";
import { getEmployees } from "@/lib/store";
import {
  canAccessSection,
  fullPermissionMatrix,
  isAdminUsername,
} from "@/lib/permissions";
import type { PermissionMatrix } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePermission("utilisateurs.comptes", "read");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const user = await getUtilisateur(id);
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePermission("utilisateurs.comptes", "write");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = await getUtilisateur(id);
  if (!existing) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const body = (await request.json()) as {
    username?: string;
    password?: string;
    matriculAgent?: string | null;
    permissions?: PermissionMatrix;
    actif?: boolean;
  };

  if (body.matriculAgent?.trim()) {
    const employees = await getEmployees();
    const exists = employees.some((e) => e.matricule === body.matriculAgent?.trim());
    if (!exists) {
      return NextResponse.json(
        { error: "Matricule employé introuvable" },
        { status: 400 }
      );
    }
  }

  if (
    isAdminUsername(existing.username) &&
    body.username &&
    !isAdminUsername(body.username)
  ) {
    return NextResponse.json(
      { error: "Le compte Admin ne peut pas être renommé" },
      { status: 400 }
    );
  }

  if (isAdminUsername(existing.username) && body.actif === false) {
    return NextResponse.json(
      { error: "Le compte Admin ne peut pas être désactivé" },
      { status: 400 }
    );
  }

  if (body.permissions !== undefined) {
    const canEditPermissions =
      isAdminUsername(auth.user.username) ||
      canAccessSection(auth.user.permissions, "utilisateurs.permissions", "write", auth.user.username);
    if (!canEditPermissions) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  }

  try {
    const user = await updateUtilisateur(
      id,
      {
        username: body.username?.trim(),
        password: body.password,
        matriculAgent: body.matriculAgent,
        permissions: body.permissions,
        actif: body.actif,
      },
      { updatedBy: auth.user.username }
    );

    const response = NextResponse.json(user);
    const session = await getSessionUser();
    if (session && String(session.id) === id) {
      const permissions = isAdminUsername(user.username)
        ? fullPermissionMatrix()
        : user.permissions;
      const token = await createSessionToken({
        id: Number(id),
        username: user.username,
        matriculAgent: user.matriculAgent,
        permissions,
      });
      response.cookies.set(sessionCookieOptions(token));
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur mise à jour";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requirePermission("utilisateurs.comptes", "delete");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = await getUtilisateur(id);
  if (!existing) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  if (isAdminUsername(existing.username)) {
    return NextResponse.json(
      { error: "Le compte Admin ne peut pas être supprimé" },
      { status: 400 }
    );
  }

  try {
    await deleteUtilisateur(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur suppression";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
