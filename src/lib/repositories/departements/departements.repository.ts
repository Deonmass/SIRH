import type { DbDepartementRow } from "../../../../database/migrations/002_departements.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import type { Departement } from "@/lib/types";
import {
  departementIdFromApp,
  departementToRow,
  rowToDepartement,
  suggestDepartementCode,
  suggestUniqueLibelle,
} from "./mapper";

const TABLE = "departements";

function client() {
  return createSupabaseAdminAnonClient();
}

async function selectAllRows(): Promise<DbDepartementRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("ordre", { ascending: true })
    .order("libelle", { ascending: true });
  if (error) throw new Error(`departements.select: ${error.message}`);
  return (data ?? []) as DbDepartementRow[];
}

export async function listDepartements(options?: {
  activeOnly?: boolean;
}): Promise<Departement[]> {
  let rows = await selectAllRows();
  if (options?.activeOnly) {
    rows = rows.filter((row) => row.actif);
  }
  return rows.map(rowToDepartement);
}

export async function getDepartementById(id: string): Promise<Departement | null> {
  const numericId = departementIdFromApp(id);
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("id", numericId)
    .maybeSingle();
  if (error) throw new Error(`departements.get: ${error.message}`);
  if (!data) return null;
  return rowToDepartement(data as DbDepartementRow);
}

export async function createDepartement(
  partial: Omit<Departement, "id" | "createdAt" | "updatedAt"> & { code?: string }
): Promise<Departement> {
  const rows = await selectAllRows();
  const codes = new Set(rows.map((row) => row.code));
  const libelles = new Set(rows.map((row) => row.libelle.trim().toLowerCase()));
  const libelle = suggestUniqueLibelle(partial.libelle, libelles);
  const ordre =
    partial.ordre ??
    (rows.length ? Math.max(...rows.map((row) => row.ordre)) + 1 : 1);
  const draft = {
    ...partial,
    libelle,
    code: partial.code ?? suggestDepartementCode(libelle, codes),
    ordre,
    actif: partial.actif ?? true,
    description: partial.description ?? "",
  };

  const { data, error } = await client()
    .from(TABLE)
    .insert(departementToRow(draft))
    .select("*")
    .single();
  if (error) throw new Error(`departements.insert: ${error.message}`);
  return rowToDepartement(data as DbDepartementRow);
}

export async function updateDepartement(departement: Departement): Promise<Departement> {
  const numericId = departementIdFromApp(departement.id);
  const { data, error } = await client()
    .from(TABLE)
    .update(departementToRow(departement))
    .eq("id", numericId)
    .select("*")
    .single();
  if (error) throw new Error(`departements.update: ${error.message}`);
  return rowToDepartement(data as DbDepartementRow);
}

export async function deleteDepartement(id: string): Promise<boolean> {
  const numericId = departementIdFromApp(id);
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", numericId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`departements.delete: ${error.message}`);
  return Boolean(data);
}

export async function replaceAllDepartements(
  departements: Omit<Departement, "id" | "createdAt" | "updatedAt">[]
): Promise<Departement[]> {
  const existing = await selectAllRows();
  if (existing.length) {
    const { error } = await client()
      .from(TABLE)
      .delete()
      .not("id", "is", null);
    if (error) throw new Error(`departements.clear: ${error.message}`);
  }

  const created: Departement[] = [];
  for (const item of departements) {
    created.push(await createDepartement(item));
  }
  return created;
}
