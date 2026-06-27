import type { DbMouvementRow, DbTypeMouvement } from "../../../../database/migrations/004_mouvements.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import { movementToInsertRow, movementToUpdateRow } from "./mapper";

const TABLE = "mouvements";

function client() {
  return createSupabaseAdminAnonClient();
}

export async function nextMouvementCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MVT-RH-${year}-`;
  const { count, error } = await client()
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .like("code_mouvement", `${prefix}%`);
  if (error) throw new Error(`mouvements.count: ${error.message}`);
  return `${prefix}${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export async function listMouvementsByMatricule(matricule: string): Promise<DbMouvementRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("matricule_employe", matricule)
    .order("date_mouvement", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(`mouvements.select: ${error.message}`);
  return (data ?? []) as DbMouvementRow[];
}

export async function listAllMouvements(): Promise<DbMouvementRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("date_mouvement", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(`mouvements.selectAll: ${error.message}`);
  return (data ?? []) as DbMouvementRow[];
}

export async function createMouvement(input: {
  matricule_employe: string;
  type_mouvement: DbTypeMouvement;
  date_mouvement: string;
  code_poste?: string | null;
  document_annexe?: string | null;
  code_mouvement?: string;
  cree_par?: string | null;
}): Promise<DbMouvementRow> {
  const code_mouvement = input.code_mouvement ?? (await nextMouvementCode());
  const { data, error } = await client()
    .from(TABLE)
    .insert(
      movementToInsertRow({
        ...input,
        code_mouvement,
      })
    )
    .select("*")
    .single();
  if (error) throw new Error(`mouvements.insert: ${error.message}`);
  return data as DbMouvementRow;
}

export async function getMouvementById(id: string): Promise<DbMouvementRow | null> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("id", numericId)
    .maybeSingle();
  if (error) throw new Error(`mouvements.get: ${error.message}`);
  return (data as DbMouvementRow | null) ?? null;
}

export async function updateMouvement(
  id: string,
  input: {
    type_mouvement: DbTypeMouvement;
    date_mouvement: string;
    code_poste?: string | null;
    document_annexe?: string | null;
    modif_par?: string | null;
  }
): Promise<DbMouvementRow> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error(`Identifiant de mouvement invalide : ${id}`);
  }
  const { data, error } = await client()
    .from(TABLE)
    .update(movementToUpdateRow(input))
    .eq("id", numericId)
    .select("*")
    .single();
  if (error) throw new Error(`mouvements.update: ${error.message}`);
  return data as DbMouvementRow;
}

export async function deleteMouvement(id: string): Promise<boolean> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return false;
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", numericId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`mouvements.delete: ${error.message}`);
  return Boolean(data);
}
