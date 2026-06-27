import { getUtilisateur } from "@/lib/auth/users";
import type { AuthUser } from "@/contexts/AuthContext";
import { fullPermissionMatrix, isAdminUsername } from "@/lib/permissions";
import type { SessionUser } from "./session";

export async function sessionToAuthUser(session: SessionUser): Promise<AuthUser> {
  const fresh = await getUtilisateur(String(session.id));
  const permissions =
    fresh && isAdminUsername(fresh.username)
      ? fullPermissionMatrix()
      : (fresh?.permissions ?? session.permissions ?? {});

  return {
    id: String(session.id),
    username: session.username,
    matriculAgent: fresh?.matriculAgent ?? session.matriculAgent,
    permissions,
  };
}
