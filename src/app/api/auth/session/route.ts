import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getUtilisateur } from "@/lib/auth/users";
import { departmentForMatricule } from "@/lib/conges-validation-access";
import { getEmployees } from "@/lib/store";
import { fullPermissionMatrix, isAdminUsername } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const fresh = await getUtilisateur(String(session.id));
  const permissions =
    fresh && isAdminUsername(fresh.username)
      ? fullPermissionMatrix()
      : (fresh?.permissions ?? session.permissions);

  const matriculAgent = fresh?.matriculAgent ?? session.matriculAgent;
  const employees = await getEmployees();
  const validatorDepartment = departmentForMatricule(matriculAgent, employees);

  return NextResponse.json({
    user: {
      id: String(session.id),
      username: session.username,
      matriculAgent,
      validatorDepartment,
      permissions,
    },
  });
}
