import { getUtilisateurByIdFromDb } from "@/lib/repositories/utilisateurs";
import { fullPermissionMatrix, isAdminUsername } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { SessionIdentity, SessionUser } from "./session";

/** Charge les permissions depuis la base (le cookie ne les contient plus). */
export async function hydrateSessionUser(identity: SessionIdentity): Promise<SessionUser> {
  if (isAdminUsername(identity.username)) {
    return { ...identity, permissions: fullPermissionMatrix() };
  }
  if (isSupabaseConfigured()) {
    const fresh = await getUtilisateurByIdFromDb(String(identity.id));
    return {
      ...identity,
      matriculAgent: fresh?.matriculAgent ?? identity.matriculAgent,
      permissions: fresh?.permissions ?? {},
    };
  }
  const { getUtilisateur } = await import("@/lib/auth/users");
  const fresh = await getUtilisateur(String(identity.id));
  return {
    ...identity,
    matriculAgent: fresh?.matriculAgent ?? identity.matriculAgent,
    permissions: fresh?.permissions ?? {},
  };
}
