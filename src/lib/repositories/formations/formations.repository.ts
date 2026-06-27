import type { DbFormationRow } from "../../../../database/migrations/017_formations_table.types";
import { parseParticipationJson } from "@/lib/formations-utils";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import { logMutation, snapshot } from "@/lib/activity-log-mutation";
import { rowToFormationRecord } from "@/lib/formations-utils";
import type { FormationParticipant } from "@/lib/types";

const TABLE = "formations";

function client() {
  return createSupabaseAdminAnonClient();
}

export async function listFormationsFromDb(): Promise<DbFormationRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("date_debut", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(`formations.select: ${error.message}`);
  return (data ?? []).map(normalizeRow);
}

export async function getFormationById(id: number): Promise<DbFormationRow | null> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`formations.get: ${error.message}`);
  return data ? normalizeRow(data) : null;
}

export type CreateFormationInput = {
  titre: string;
  date_debut: string;
  date_fin: string;
  niveau?: string | null;
  instructeur?: string | null;
  commentaire?: string | null;
  participation?: FormationParticipant[];
};

export async function createFormationInDb(input: CreateFormationInput): Promise<DbFormationRow> {
  const { data, error } = await client()
    .from(TABLE)
    .insert({
      titre: input.titre,
      date_debut: input.date_debut,
      date_fin: input.date_fin,
      niveau: input.niveau ?? null,
      instructeur: input.instructeur ?? null,
      commentaire: input.commentaire ?? null,
      participation: input.participation ?? [],
    })
    .select("*")
    .single();
  if (error) throw new Error(`formations.insert: ${error.message}`);
  const row = normalizeRow(data);
  const record = rowToFormationRecord(row);
  await logMutation({
    action: "insertion",
    entityType: "formation",
    entityId: String(record.id),
    entityLabel: record.titre,
    summary: `Création formation « ${record.titre} »`,
    payloadAfter: snapshot(record),
  });
  return row;
}

export async function updateFormationInDb(
  id: number,
  patch: Partial<CreateFormationInput>
): Promise<DbFormationRow> {
  const beforeRow = await getFormationById(id);
  const before = beforeRow ? rowToFormationRecord(beforeRow) : null;
  const row: Record<string, unknown> = {};
  if (patch.titre !== undefined) row.titre = patch.titre;
  if (patch.date_debut !== undefined) row.date_debut = patch.date_debut;
  if (patch.date_fin !== undefined) row.date_fin = patch.date_fin;
  if (patch.niveau !== undefined) row.niveau = patch.niveau;
  if (patch.instructeur !== undefined) row.instructeur = patch.instructeur;
  if (patch.commentaire !== undefined) row.commentaire = patch.commentaire;
  if (patch.participation !== undefined) row.participation = patch.participation;

  const { data, error } = await client()
    .from(TABLE)
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`formations.update: ${error.message}`);
  const updatedRow = normalizeRow(data);
  const record = rowToFormationRecord(updatedRow);
  await logMutation({
    action: "modification",
    entityType: "formation",
    entityId: String(record.id),
    entityLabel: record.titre,
    summary: `Modification formation « ${record.titre} »`,
    payloadBefore: before ? snapshot(before) : null,
    payloadAfter: snapshot(record),
  });
  return updatedRow;
}

export async function deleteFormationInDb(id: number): Promise<boolean> {
  const beforeRow = await getFormationById(id);
  const before = beforeRow ? rowToFormationRecord(beforeRow) : null;
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`formations.delete: ${error.message}`);
  const ok = Boolean(data);
  if (ok && before) {
    await logMutation({
      action: "suppression",
      entityType: "formation",
      entityId: String(before.id),
      entityLabel: before.titre,
      summary: `Suppression formation « ${before.titre} »`,
      payloadBefore: snapshot(before),
      payloadAfter: null,
    });
  }
  return ok;
}

function normalizeRow(raw: Record<string, unknown>): DbFormationRow {
  return {
    id: raw.id as number,
    titre: raw.titre as string,
    date_debut: raw.date_debut as string,
    date_fin: raw.date_fin as string,
    niveau: (raw.niveau as string | null) ?? null,
    instructeur: (raw.instructeur as string | null) ?? null,
    commentaire: (raw.commentaire as string | null) ?? null,
    participation: parseParticipationJson(raw.participation),
    cree_le: raw.cree_le as string,
    modif_le: raw.modif_le as string,
  };
}
