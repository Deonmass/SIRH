import type { DbCongeRow } from "../../../../database/migrations/010_conges.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import type { LeaveRequestStatus, LeaveType } from "@/lib/types";
import { leaveToInsertRow, leaveToUpdateRow, congeIdFromApp } from "./mapper";

const TABLE = "conges";

function client() {
  return createSupabaseAdminAnonClient();
}

export async function listCongesByMatricule(matricule: string): Promise<DbCongeRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("matricule_employe", matricule)
    .order("date_debut", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(`conges.select: ${error.message}`);
  return (data ?? []) as DbCongeRow[];
}

export async function listAllCongesFromDb(): Promise<DbCongeRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("date_debut", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(`conges.selectAll: ${error.message}`);
  return (data ?? []) as DbCongeRow[];
}

export async function createCongeInDb(input: {
  matricule_employe: string;
  type: LeaveType;
  date_debut: string;
  date_fin: string;
  jours: number;
  statut?: LeaveRequestStatus;
  notes?: string | null;
  validateur_1?: string | null;
  validateur_2?: string | null;
  cree_par?: string | null;
}): Promise<DbCongeRow> {
  const { data, error } = await client()
    .from(TABLE)
    .insert(leaveToInsertRow(input))
    .select("*")
    .single();
  if (error) throw new Error(`conges.insert: ${error.message}`);
  return data as DbCongeRow;
}

export async function updateCongeInDb(
  id: string,
  input: {
    type: LeaveType;
    date_debut: string;
    date_fin: string;
    jours: number;
    statut: LeaveRequestStatus;
    notes?: string | null;
    validateur_1?: string | null;
    validateur_2?: string | null;
    modif_par?: string | null;
  }
): Promise<DbCongeRow> {
  const numericId = congeIdFromApp(id);
  const { data, error } = await client()
    .from(TABLE)
    .update(leaveToUpdateRow(input))
    .eq("id", numericId)
    .select("*")
    .single();
  if (error) throw new Error(`conges.update: ${error.message}`);
  return data as DbCongeRow;
}

export async function patchCongeStatusInDb(
  id: string,
  statut: LeaveRequestStatus,
  notes?: string | null,
  modif_par?: string | null
): Promise<DbCongeRow> {
  const numericId = congeIdFromApp(id);
  const patch: Record<string, unknown> = { statut, modif_par: modif_par ?? null };
  if (notes !== undefined) patch.notes = notes;
  const { data, error } = await client()
    .from(TABLE)
    .update(patch)
    .eq("id", numericId)
    .select("*")
    .single();
  if (error) throw new Error(`conges.patchStatus: ${error.message}`);
  return data as DbCongeRow;
}

export async function deleteCongeInDb(id: string): Promise<boolean> {
  const numericId = congeIdFromApp(id);
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", numericId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`conges.delete: ${error.message}`);
  return Boolean(data);
}
