import type { DbPaieRow } from "../../../../database/migrations/021_paie_table.types";
import {
  moisAnneeFromPaieRow,
  parsePaiePayload,
  rowToPaieRecord,
} from "@/lib/paie-utils";
import { logMutation, snapshot } from "@/lib/activity-log-mutation";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";

const TABLE = "paie";

function client() {
  return createSupabaseAdminAnonClient();
}

function normalizeRow(raw: Record<string, unknown>): DbPaieRow {
  return {
    id: raw.id as number,
    matricul_employe: raw.matricul_employe as string,
    paie: (raw.paie as string | null) ?? null,
    created_at: raw.created_at as string,
    created_by: (raw.created_by as string | null) ?? null,
    updated_at: raw.updated_at as string,
    updated_by: (raw.updated_by as string | null) ?? null,
  };
}

function filterByMois(rows: DbPaieRow[], moisAnnee?: string): DbPaieRow[] {
  if (!moisAnnee) return rows;
  return rows.filter((r) => moisAnneeFromPaieRow(r) === moisAnnee);
}

export async function listPaieFromDb(moisAnnee?: string, matricule?: string): Promise<DbPaieRow[]> {
  let q = client().from(TABLE).select("*").order("id", { ascending: false });
  if (matricule) q = q.eq("matricul_employe", matricule);
  const { data, error } = await q;
  if (error) throw new Error(`paie.select: ${error.message}`);
  const rows = (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
  return filterByMois(rows, moisAnnee);
}

export async function getPaieById(id: number): Promise<DbPaieRow | null> {
  const { data, error } = await client().from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`paie.get: ${error.message}`);
  return data ? normalizeRow(data as Record<string, unknown>) : null;
}

export async function getPaieByMatriculeMois(
  matricule: string,
  moisAnnee: string
): Promise<DbPaieRow | null> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("matricul_employe", matricule)
    .order("id", { ascending: false });
  if (error) throw new Error(`paie.getByMatricule: ${error.message}`);
  const rows = (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
  return rows.find((r) => moisAnneeFromPaieRow(r) === moisAnnee) ?? null;
}

/** Upsert par matricule + mois_annee contenu dans le JSON paie */
export async function upsertPaieInDb(input: {
  matricul_employe: string;
  paie: string;
  created_by?: string;
  updated_by?: string;
}): Promise<DbPaieRow> {
  const moisAnnee = parsePaiePayload(input.paie).mois_annee;
  if (!moisAnnee?.match(/^\d{4}-\d{2}$/)) {
    throw new Error("paie.upsert: mois_annee (YYYY-MM) requis dans le JSON paie");
  }

  const existing = await getPaieByMatriculeMois(input.matricul_employe, moisAnnee);
  const now = new Date().toISOString();

  if (existing) {
    const { data, error } = await client()
      .from(TABLE)
      .update({
        paie: input.paie,
        updated_at: now,
        updated_by: input.updated_by ?? null,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(`paie.update: ${error.message}`);
    const row = normalizeRow(data as Record<string, unknown>);
    const record = rowToPaieRecord(row);
    await logMutation({
      action: "modification",
      entityType: "paie",
      entityId: String(row.id),
      entityLabel: `${input.matricul_employe} — ${moisAnnee}`,
      summary: `Modification paie ${moisAnnee} — ${input.matricul_employe}`,
      payloadBefore: snapshot(rowToPaieRecord(existing)),
      payloadAfter: snapshot(record),
      createdBy: input.updated_by ?? undefined,
    });
    return row;
  }

  const { data, error } = await client()
    .from(TABLE)
    .insert({
      matricul_employe: input.matricul_employe,
      paie: input.paie,
      created_by: input.created_by ?? null,
      updated_by: input.updated_by ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`paie.insert: ${error.message}`);
  const row = normalizeRow(data as Record<string, unknown>);
  const record = rowToPaieRecord(row);
  await logMutation({
    action: "insertion",
    entityType: "paie",
    entityId: String(row.id),
    entityLabel: `${input.matricul_employe} — ${moisAnnee}`,
    summary: `Enregistrement paie ${moisAnnee} — ${input.matricul_employe}`,
    payloadAfter: snapshot(record),
    createdBy: input.created_by ?? undefined,
  });
  return row;
}

export { rowToPaieRecord };
