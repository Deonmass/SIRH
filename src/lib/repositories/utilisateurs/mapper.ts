import type { DbUtilisateurRow } from "../../../../database/migrations/023_utilisateurs.types";
import {
  fullPermissionMatrix,
  isAdminUsername,
  normalizePermissionMatrix,
  type PermissionMatrix,
} from "@/lib/permissions";
import type { Utilisateur } from "@/lib/types";
import { actifFromStatut, statutFromActif } from "./statut";

export function rowToUtilisateur(row: DbUtilisateurRow): Utilisateur {
  const permissions = resolvePermissions(row.username, row.permissions);
  return {
    id: String(row.id),
    username: row.username,
    matriculAgent: row.matricul_agent,
    permissions,
    actif: actifFromStatut(row.statut),
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export function resolvePermissions(
  username: string,
  raw: unknown
): PermissionMatrix {
  if (isAdminUsername(username)) return fullPermissionMatrix();
  return normalizePermissionMatrix(raw);
}

export function utilisateurToRow(
  input: {
    username: string;
    passeword?: string;
    matriculAgent?: string | null;
    permissions?: PermissionMatrix;
    actif?: boolean;
  },
  audit?: { createdBy?: string; updatedBy?: string }
): Partial<DbUtilisateurRow> {
  return {
    username: input.username.trim(),
    ...(input.passeword !== undefined ? { passeword: input.passeword } : {}),
    matricul_agent: input.matriculAgent?.trim() || null,
    permissions: input.permissions ?? {},
    ...(input.actif !== undefined ? { statut: statutFromActif(input.actif) } : {}),
    ...(audit?.createdBy !== undefined ? { created_by: audit.createdBy } : {}),
    ...(audit?.updatedBy !== undefined ? { updated_by: audit.updatedBy } : {}),
  };
}
