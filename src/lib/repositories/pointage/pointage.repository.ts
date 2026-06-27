import type { DbPointageRow } from "../../../../database/migrations/019_pointage_table.types";
import {
  encodePointagePayload,
  parsePointagePayload,
  preparePointagePayload,
  rowToPointageRecord,
} from "@/lib/pointage-utils";
import type { DbPointageJourJson } from "../../../../database/migrations/019_pointage_table.types";
import type { WorkMonthMode } from "@/lib/types";
import { logMutation, snapshot } from "@/lib/activity-log-mutation";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";

const TABLE = "pointage";

function client() {
  return createSupabaseAdminAnonClient();
}

function normalizeRow(raw: Record<string, unknown>): DbPointageRow {
  const pointage = (raw.pointage as string | null) ?? null;
  const payloadModif = pointage ? parsePointagePayload(pointage).modif_le : undefined;
  const fallback = payloadModif ?? new Date().toISOString();
  return {
    id: raw.id as number,
    matricul_employe: raw.matricul_employe as string,
    mois_annee: raw.mois_annee as string,
    pointage,
    cree_le: (raw.cree_le as string | undefined) ?? fallback,
    modif_le: (raw.modif_le as string | undefined) ?? fallback,
  };
}

export async function listPointageFromDb(moisAnnee?: string): Promise<DbPointageRow[]> {
  let q = client().from(TABLE).select("*").order("mois_annee", { ascending: false }).order("id", { ascending: false });
  if (moisAnnee) q = q.eq("mois_annee", moisAnnee);
  const { data, error } = await q;
  if (error) throw new Error(`pointage.select: ${error.message}`);
  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
}

export async function getPointageById(id: number): Promise<DbPointageRow | null> {
  const { data, error } = await client().from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`pointage.get: ${error.message}`);
  return data ? normalizeRow(data as Record<string, unknown>) : null;
}

export async function getPointageByMatriculeMois(
  matricule: string,
  moisAnnee: string
): Promise<DbPointageRow | null> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("matricul_employe", matricule)
    .eq("mois_annee", moisAnnee)
    .maybeSingle();
  if (error) throw new Error(`pointage.getByMatricule: ${error.message}`);
  return data ? normalizeRow(data as Record<string, unknown>) : null;
}

export async function upsertPointageInDb(input: {
  matricul_employe: string;
  mois_annee: string;
  jours: DbPointageJourJson[];
  verrouille?: boolean;
  commentaire_mois?: string | null;
  workMonthMode?: WorkMonthMode;
}): Promise<DbPointageRow> {
  const existing = await getPointageByMatriculeMois(input.matricul_employe, input.mois_annee);
  const payload = encodePointagePayload(
    preparePointagePayload(input.jours, {
      verrouille: input.verrouille,
      commentaire_mois: input.commentaire_mois,
      workMonthMode: input.workMonthMode,
    })
  );

  if (existing) {
    const { data, error } = await client()
      .from(TABLE)
      .update({ pointage: payload })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(`pointage.update: ${error.message}`);
    const row = normalizeRow(data as Record<string, unknown>);
    const record = rowToPointageRecord(row);
    await logMutation({
      action: "modification",
      entityType: "pointage",
      entityId: String(row.id),
      entityLabel: `${input.matricul_employe} — ${input.mois_annee}`,
      summary: `Modification pointage ${input.mois_annee} — ${input.matricul_employe}`,
      payloadBefore: snapshot(rowToPointageRecord(existing)),
      payloadAfter: snapshot(record),
    });
    return row;
  }

  const { data, error } = await client()
    .from(TABLE)
    .insert({
      matricul_employe: input.matricul_employe,
      mois_annee: input.mois_annee,
      pointage: payload,
    })
    .select("*")
    .single();
  if (error) throw new Error(`pointage.insert: ${error.message}`);
  const row = normalizeRow(data as Record<string, unknown>);
  const record = rowToPointageRecord(row);
  await logMutation({
    action: "insertion",
    entityType: "pointage",
    entityId: String(row.id),
    entityLabel: `${input.matricul_employe} — ${input.mois_annee}`,
    summary: `Saisie pointage ${input.mois_annee} — ${input.matricul_employe}`,
    payloadAfter: snapshot(record),
  });
  return row;
}

export async function deletePointageInDb(id: number): Promise<boolean> {
  const before = await getPointageById(id);
  const { data, error } = await client().from(TABLE).delete().eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(`pointage.delete: ${error.message}`);
  const ok = Boolean(data);
  if (ok && before) {
    const record = rowToPointageRecord(before);
    await logMutation({
      action: "suppression",
      entityType: "pointage",
      entityId: String(before.id),
      entityLabel: `${before.matricul_employe} — ${before.mois_annee}`,
      summary: `Suppression pointage ${before.mois_annee} — ${before.matricul_employe}`,
      payloadBefore: snapshot(record),
      payloadAfter: null,
    });
  }
  return ok;
}

export { rowToPointageRecord, parsePointagePayload };
