import type { DbHopitalVisiteRow } from "../../../../database/migrations/032_hopital_visite.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import {
  parseSanteVisiteFichiers,
  serializeSanteVisiteValidation,
} from "@/lib/sante-visite";

export interface HopitalVisite {
  id: string;
  matriculeAgent?: string;
  hopital?: string;
  dateVisite?: string;
  motif?: string;
  montant?: number;
  fichiers?: ReturnType<typeof parseSanteVisiteFichiers>;
  validation?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

const TABLE = "hopital_visite";

function toAuditUuid(value?: string | null): string | null {
  if (!value) return null;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    return value;
  }
  return null;
}

function client() {
  return createSupabaseAdminAnonClient();
}

function rowToVisite(row: DbHopitalVisiteRow): HopitalVisite {
  return {
    id: String(row.id),
    matriculeAgent: row.matricule_agent ?? undefined,
    hopital: row.hopital ?? undefined,
    dateVisite: row.date_visite ?? undefined,
    motif: row.motif ?? undefined,
    montant: row.montant != null ? Number(row.montant) : undefined,
    fichiers: parseSanteVisiteFichiers(row.fichiers),
    validation: row.validation ?? serializeSanteVisiteValidation({ statut: "en_attente" }),
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? undefined,
  };
}

function missingTable(error: { message: string; code?: string }) {
  return (
    error.code === "PGRST205" ||
    error.message.includes("Could not find the table") ||
    error.message.includes("schema cache")
  );
}

export async function getHopitalVisiteById(id: string): Promise<HopitalVisite | null> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("id", Number(id))
    .maybeSingle();
  if (error) throw new Error(`hopital_visite.get: ${error.message}`);
  if (!data) return null;
  return rowToVisite(data as DbHopitalVisiteRow);
}

export async function listHopitalVisites(): Promise<HopitalVisite[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (missingTable(error)) return [];
    throw new Error(`hopital_visite.select: ${error.message}`);
  }
  return ((data ?? []) as DbHopitalVisiteRow[]).map(rowToVisite);
}

export async function createHopitalVisite(
  input: Omit<HopitalVisite, "id" | "createdAt" | "updatedAt">
): Promise<HopitalVisite> {
  const now = new Date().toISOString();
  const { data, error } = await client()
    .from(TABLE)
    .insert({
      matricule_agent: input.matriculeAgent ?? null,
      hopital: input.hopital ?? null,
      date_visite: input.dateVisite ?? null,
      motif: input.motif ?? null,
      montant: input.montant ?? null,
      fichiers: input.fichiers ?? null,
      validation: input.validation ?? serializeSanteVisiteValidation({ statut: "en_attente" }),
      created_by: toAuditUuid(input.createdBy),
      updated_by: toAuditUuid(input.updatedBy),
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) throw new Error(`hopital_visite.insert: ${error.message}`);
  return rowToVisite(data as DbHopitalVisiteRow);
}

export async function updateHopitalVisite(item: HopitalVisite): Promise<HopitalVisite> {
  const { data, error } = await client()
    .from(TABLE)
    .update({
      matricule_agent: item.matriculeAgent ?? null,
      hopital: item.hopital ?? null,
      date_visite: item.dateVisite ?? null,
      motif: item.motif ?? null,
      montant: item.montant ?? null,
      fichiers: item.fichiers ?? null,
      validation: item.validation ?? serializeSanteVisiteValidation({ statut: "en_attente" }),
      updated_by: toAuditUuid(item.updatedBy),
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(item.id))
    .select("*")
    .single();
  if (error) throw new Error(`hopital_visite.update: ${error.message}`);
  return rowToVisite(data as DbHopitalVisiteRow);
}

export async function deleteHopitalVisite(id: string): Promise<boolean> {
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", Number(id))
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`hopital_visite.delete: ${error.message}`);
  return Boolean(data);
}
