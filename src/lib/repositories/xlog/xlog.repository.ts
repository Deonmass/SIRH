import type { ActivityAction, ActivityEntityType } from "../../../../database/migrations/025_xlog.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import { rowToActivityLog, type RawXlogRow } from "./mapper";
import type { ActivityLogEntry } from "@/lib/types";

/** Nom de table Supabase (sensible à la casse). */
const TABLE = "Xlog";

function client() {
  return createSupabaseAdminAnonClient();
}

function isMissingXlogTable(message: string): boolean {
  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes('relation "public.xlog" does not exist')
  );
}

function isColumnError(message: string): boolean {
  return (
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("PGRST204")
  );
}

export type ListXlogFilters = {
  utilisateur?: string;
  from?: string;
  to?: string;
  limit?: number;
};

function buildDetails(input: {
  entityType: ActivityEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
  payloadBefore?: Record<string, unknown> | null;
  payloadAfter?: Record<string, unknown> | null;
  changes?: Record<string, { before: unknown; after: unknown }> | null;
}) {
  return {
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    entity_label: input.entityLabel ?? null,
    summary: input.summary,
    payload_before: input.payloadBefore ?? null,
    payload_after: input.payloadAfter ?? null,
    changes: input.changes ?? null,
  };
}

export async function insertXlogRow(input: {
  utilisateur: string;
  action: ActivityAction;
  createdBy: string;
  entityType: ActivityEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
  payloadBefore?: Record<string, unknown> | null;
  payloadAfter?: Record<string, unknown> | null;
  changes?: Record<string, { before: unknown; after: unknown }> | null;
}): Promise<ActivityLogEntry> {
  const details = buildDetails(input);

  const attempts: Record<string, unknown>[] = [
    {
      utilisateur: input.utilisateur,
      action: input.action,
      created_by: input.createdBy,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      entity_label: input.entityLabel ?? null,
      summary: input.summary,
      payload_before: input.payloadBefore ?? null,
      payload_after: input.payloadAfter ?? null,
      details,
    },
    {
      utilisateur: input.utilisateur,
      action: input.action,
      created_by: input.createdBy,
      details,
    },
    {
      utlisateur: input.utilisateur,
      action: input.action,
      "created by": input.createdBy,
      details,
    },
    {
      utlisateur: input.utilisateur,
      action: `${input.action}|${input.entityType}|${input.summary}`,
      "created by": input.createdBy,
      details,
    },
  ];

  let lastMessage = "Xlog.insert: échec inconnu";

  for (const row of attempts) {
    const { data, error } = await client().from(TABLE).insert(row).select("*").single();
    if (!error && data) {
      return rowToActivityLog(data as RawXlogRow);
    }
    lastMessage = error?.message ?? lastMessage;
    if (!isColumnError(lastMessage)) break;
  }

  throw new Error(`Xlog.insert: ${lastMessage}`);
}

export async function listXlogRows(filters: ListXlogFilters = {}): Promise<ActivityLogEntry[]> {
  const limit = filters.limit ?? 500;
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingXlogTable(error.message)) return [];
    throw new Error(`Xlog.list: ${error.message}`);
  }

  let entries = ((data ?? []) as RawXlogRow[]).map(rowToActivityLog);

  if (filters.utilisateur?.trim()) {
    const needle = filters.utilisateur.trim().toLowerCase();
    entries = entries.filter((e) => e.utilisateur?.toLowerCase() === needle);
  }
  if (filters.from) {
    const fromMs = Date.parse(filters.from);
    entries = entries.filter((e) => Date.parse(e.createdAt) >= fromMs);
  }
  if (filters.to) {
    const toMs = Date.parse(filters.to);
    entries = entries.filter((e) => Date.parse(e.createdAt) <= toMs);
  }

  return entries;
}

export async function getXlogRowById(id: string): Promise<ActivityLogEntry | null> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return null;
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("id", numericId)
    .maybeSingle();
  if (error) {
    if (isMissingXlogTable(error.message)) return null;
    throw new Error(`Xlog.getById: ${error.message}`);
  }
  if (!data) return null;
  return rowToActivityLog(data as RawXlogRow);
}

export async function markXlogUndone(id: string, undoneBy: string): Promise<ActivityLogEntry> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) throw new Error("Identifiant log invalide");

  const patchAttempts: Record<string, unknown>[] = [
    { undone_at: new Date().toISOString(), undone_by: undoneBy },
    { details: { undone_at: new Date().toISOString(), undone_by: undoneBy } },
  ];

  let lastMessage = "Xlog.undo: échec";

  for (const patch of patchAttempts) {
    const { data, error } = await client()
      .from(TABLE)
      .update(patch)
      .eq("id", numericId)
      .select("*")
      .single();
    if (!error && data) return rowToActivityLog(data as RawXlogRow);
    lastMessage = error?.message ?? lastMessage;
    if (!isColumnError(lastMessage)) break;
  }

  throw new Error(lastMessage);
}

export async function deleteXlogRow(id: string): Promise<boolean> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return false;

  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", numericId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingXlogTable(error.message)) return false;
    throw new Error(`Xlog.delete: ${error.message}`);
  }
  return Boolean(data);
}

export async function listDistinctXlogUsers(): Promise<string[]> {
  const { data, error } = await client().from(TABLE).select("*").limit(1000);

  if (error) {
    if (isMissingXlogTable(error.message)) return [];
    throw new Error(`Xlog.users: ${error.message}`);
  }

  const names = new Set<string>();
  for (const row of data ?? []) {
    const entry = rowToActivityLog(row as RawXlogRow);
    const name = entry.utilisateur?.trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "fr"));
}
