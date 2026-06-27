import type { DbTypeCoursRow } from "../../../database/migrations/036_type_cours.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";

export interface TypeCours {
  id: string;
  designation: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export type TypeCoursInput = Omit<
  TypeCours,
  "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>;

const TABLE = "type_cours";

function client() {
  return createSupabaseAdminAnonClient();
}

function missingTable(error: { message: string; code?: string }) {
  return (
    error.code === "PGRST205" ||
    error.message.includes("Could not find the table") ||
    error.message.includes("schema cache")
  );
}

function rowToTypeCours(row: DbTypeCoursRow): TypeCours {
  return {
    id: String(row.id),
    designation: row.designation,
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? undefined,
  };
}

export async function listTypeCours(): Promise<TypeCours[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    if (missingTable(error)) return [];
    throw new Error(`type_cours.select: ${error.message}`);
  }
  return ((data ?? []) as DbTypeCoursRow[]).map(rowToTypeCours);
}

export async function createTypeCours(input: TypeCoursInput): Promise<TypeCours> {
  const { data, error } = await client()
    .from(TABLE)
    .insert({ designation: input.designation.trim() })
    .select("*")
    .single();
  if (error) throw new Error(`type_cours.insert: ${error.message}`);
  return rowToTypeCours(data as DbTypeCoursRow);
}

export async function updateTypeCours(item: TypeCours): Promise<TypeCours> {
  const { data, error } = await client()
    .from(TABLE)
    .update({
      designation: item.designation.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(item.id))
    .select("*")
    .single();
  if (error) throw new Error(`type_cours.update: ${error.message}`);
  return rowToTypeCours(data as DbTypeCoursRow);
}

export async function deleteTypeCours(id: string): Promise<boolean> {
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", Number(id))
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`type_cours.delete: ${error.message}`);
  return Boolean(data);
}
