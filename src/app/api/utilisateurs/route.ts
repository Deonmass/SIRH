import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-auth";
import { createUtilisateur, listUtilisateurs } from "@/lib/auth/users";
import { getEmployees } from "@/lib/store";
import type { PermissionMatrix } from "@/lib/permissions";

export async function GET() {
  const auth = await requirePermission("utilisateurs.comptes", "read");
  if (!auth.ok) return auth.response;

  const [users, employees] = await Promise.all([listUtilisateurs(), getEmployees()]);
  const byMatricule = new Map(employees.map((e) => [e.matricule, e]));

  return NextResponse.json(
    users.map((user) => {
      const employee = user.matriculAgent ? byMatricule.get(user.matriculAgent) : null;
      return {
        ...user,
        employeeName: employee
          ? `${employee.prenom} ${employee.nom}`.trim()
          : null,
      };
    })
  );
}

export async function POST(request: Request) {
  const auth = await requirePermission("utilisateurs.comptes", "write");
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    username?: string;
    password?: string;
    matriculAgent?: string | null;
    permissions?: PermissionMatrix;
    actif?: boolean;
  };

  if (!body.username?.trim() || !body.password) {
    return NextResponse.json(
      { error: "Nom d'utilisateur et mot de passe requis" },
      { status: 400 }
    );
  }

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

  try {
    const user = await createUtilisateur(
      {
        username: body.username.trim(),
        password: body.password,
        matriculAgent: body.matriculAgent?.trim() || null,
        permissions: body.permissions,
        actif: body.actif,
      },
      { createdBy: auth.user.username }
    );
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur création compte";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
