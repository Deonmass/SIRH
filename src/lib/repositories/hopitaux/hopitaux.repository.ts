import type { DbHopitalRow } from "../../../database/migrations/030_hopitales.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";

export interface Hopital {
  id: string;
  hopital: string;
  dateDebutContrat?: string;
  statut?: string;
  coutTotal?: number;
}

const TABLE = "Hopitales";

function client() {
  return createSupabaseAdminAnonClient();
}

function rowToHopital(row: DbHopitalRow): Hopital {
  return {
    id: String(row.id),
    hopital: row.hopital,
    dateDebutContrat: row.date_debut_contrat ?? undefined,
    statut: row.statut ?? undefined,
    coutTotal: row.cout_total != null ? Number(row.cout_total) : undefined,
  };
}

export async function listHopitaux(): Promise<Hopital[]> {
  const { data, error } = await client().from(TABLE).select("*").order("id", { ascending: true });
  if (error) {
    if (error.code === "PGRST205" || error.message.includes("Could not find the table")) return [];
    throw new Error(`Hopitales.select: ${error.message}`);
  }
  return ((data ?? []) as DbHopitalRow[]).map(rowToHopital);
}

export async function createHopital(
  input: Omit<Hopital, "id">
): Promise<Hopital> {
  const { data, error } = await client()
    .from(TABLE)
    .insert({
      hopital: input.hopital,
      date_debut_contrat: input.dateDebutContrat ?? null,
      statut: input.statut ?? null,
      cout_total: input.coutTotal ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Hopitales.insert: ${error.message}`);
  return rowToHopital(data as DbHopitalRow);
}

export async function updateHopital(item: Hopital): Promise<Hopital> {
  const { data, error } = await client()
    .from(TABLE)
    .update({
      hopital: item.hopital,
      date_debut_contrat: item.dateDebutContrat ?? null,
      statut: item.statut ?? null,
      cout_total: item.coutTotal ?? null,
    })
    .eq("id", Number(item.id))
    .select("*")
    .single();
  if (error) throw new Error(`Hopitales.update: ${error.message}`);
  return rowToHopital(data as DbHopitalRow);
}

export async function deleteHopital(id: string): Promise<boolean> {
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", Number(id))
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Hopitales.delete: ${error.message}`);
  return Boolean(data);
}
