import type { DbUtilisateurRow } from "../../../../database/migrations/023_utilisateurs.types";
import { hashPasswordLegacySha256 } from "@/lib/auth/password";
import { fullPermissionMatrix } from "@/lib/permissions";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import { rowToUtilisateur, utilisateurToRow } from "./mapper";
import { statutFromActif } from "./statut";
import type { PermissionMatrix } from "@/lib/permissions";
import type { Utilisateur } from "@/lib/types";

const TABLE = "utilisateurs";
const DEFAULT_ADMIN_USERNAME = "Admin";
const DEFAULT_ADMIN_PASSWORD = "123";

function client() {
  return createSupabaseAdminAnonClient();
}

async function selectAllRows(): Promise<DbUtilisateurRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("id", { ascending: true });
  if (error) throw new Error(`utilisateurs.select: ${error.message}`);
  return (data ?? []) as DbUtilisateurRow[];
}

export async function ensureDefaultAdminUser(): Promise<void> {
  const { data, error } = await client()
    .from(TABLE)
    .select("id")
    .ilike("username", DEFAULT_ADMIN_USERNAME)
    .maybeSingle();
  if (error) throw new Error(`utilisateurs.ensureAdmin: ${error.message}`);
  if (data) return;

  const { error: insertError } = await client().from(TABLE).insert({
    username: DEFAULT_ADMIN_USERNAME,
    passeword: hashPasswordLegacySha256(DEFAULT_ADMIN_PASSWORD),
    matricul_agent: null,
    permissions: fullPermissionMatrix(),
    statut: "actif",
    created_by: "system",
    updated_by: "system",
  });
  if (insertError) throw new Error(`utilisateurs.insertAdmin: ${insertError.message}`);
}

export async function listUtilisateursFromDb(): Promise<Utilisateur[]> {
  await ensureDefaultAdminUser();
  const rows = await selectAllRows();
  return rows.map(rowToUtilisateur);
}

export async function getUtilisateurByIdFromDb(id: string): Promise<Utilisateur | null> {
  const row = await getUtilisateurRowById(id);
  return row ? rowToUtilisateur(row) : null;
}

export async function getUtilisateurRowById(id: string): Promise<DbUtilisateurRow | null> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return null;
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("id", numericId)
    .maybeSingle();
  if (error) throw new Error(`utilisateurs.getById: ${error.message}`);
  if (!data) return null;
  return data as DbUtilisateurRow;
}

export async function getUtilisateurByUsernameFromDb(
  username: string
): Promise<(Utilisateur & { passeword: string }) | null> {
  await ensureDefaultAdminUser();
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .ilike("username", username.trim())
    .maybeSingle();
  if (error) throw new Error(`utilisateurs.getByUsername: ${error.message}`);
  if (!data) return null;
  const row = data as DbUtilisateurRow;
  return { ...rowToUtilisateur(row), passeword: row.passeword };
}

export async function createUtilisateurInDb(
  input: {
    username: string;
    passeword: string;
    matriculAgent?: string | null;
    permissions?: PermissionMatrix;
    actif?: boolean;
  },
  audit?: { createdBy?: string }
): Promise<Utilisateur> {
  const row = utilisateurToRow(input, { createdBy: audit?.createdBy, updatedBy: audit?.createdBy });
  const { data, error } = await client()
    .from(TABLE)
    .insert({
      ...row,
      passeword: input.passeword,
      permissions: input.permissions ?? {},
      statut: statutFromActif(input.actif ?? true),
    })
    .select("*")
    .single();
  if (error) throw new Error(`utilisateurs.create: ${error.message}`);
  return rowToUtilisateur(data as DbUtilisateurRow);
}

export async function updateUtilisateurInDb(
  id: string,
  input: {
    username?: string;
    passeword?: string;
    matriculAgent?: string | null;
    permissions?: PermissionMatrix;
    actif?: boolean;
  },
  audit?: { updatedBy?: string }
): Promise<Utilisateur> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) throw new Error("Identifiant utilisateur invalide");

  const patch = utilisateurToRow(
    {
      username: input.username ?? "",
      ...(input.passeword !== undefined ? { passeword: input.passeword } : {}),
      matriculAgent: input.matriculAgent,
      permissions: input.permissions,
      actif: input.actif,
    },
    { updatedBy: audit?.updatedBy }
  );

  if (input.username === undefined) delete patch.username;
  if (input.permissions === undefined) delete patch.permissions;
  if (input.matriculAgent === undefined) delete patch.matricul_agent;
  if (input.actif === undefined) delete patch.statut;
  if (input.passeword !== undefined) patch.passeword = input.passeword;

  const { data, error } = await client()
    .from(TABLE)
    .update(patch)
    .eq("id", numericId)
    .select("*")
    .single();
  if (error) throw new Error(`utilisateurs.update: ${error.message}`);
  return rowToUtilisateur(data as DbUtilisateurRow);
}

export async function deleteUtilisateurInDb(id: string): Promise<void> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) throw new Error("Identifiant utilisateur invalide");
  const { error } = await client().from(TABLE).delete().eq("id", numericId);
  if (error) throw new Error(`utilisateurs.delete: ${error.message}`);
}
