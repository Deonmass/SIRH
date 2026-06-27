import type {
  ActivityAction,
  ActivityEntityType,
  DbXlogRow,
} from "../../../../database/migrations/025_xlog.types";
import { resolveActivityChanges } from "@/lib/activity-log-diff";
import type { ActivityLogEntry } from "@/lib/types";

/** Ligne brute Supabase (colonnes legacy possibles). */
export type RawXlogRow = Record<string, unknown> & {
  id: number;
  action: string;
};

function parseDetails(raw: RawXlogRow): Partial<DbXlogRow> & {
  changes?: Record<string, { before: unknown; after: unknown }> | null;
} {
  const details = raw.details;
  if (!details || typeof details !== "object") return {};
  const d = details as Record<string, unknown>;
  return {
    entity_type: d.entity_type as ActivityEntityType | undefined,
    entity_id: (d.entity_id as string | null | undefined) ?? null,
    entity_label: (d.entity_label as string | null | undefined) ?? null,
    summary: d.summary as string | undefined,
    payload_before: (d.payload_before as Record<string, unknown> | null | undefined) ?? null,
    payload_after: (d.payload_after as Record<string, unknown> | null | undefined) ?? null,
    changes:
      (d.changes as Record<string, { before: unknown; after: unknown }> | null | undefined) ??
      null,
    undone_at: (d.undone_at as string | null | undefined) ?? null,
    undone_by: (d.undone_by as string | null | undefined) ?? null,
  };
}

function parseActionField(action: string): Partial<DbXlogRow> {
  const parts = action.split("|");
  if (parts.length < 3) return { summary: action };
  return {
    action: parts[0] as ActivityAction,
    entity_type: parts[1] as ActivityEntityType,
    summary: parts.slice(2).join("|"),
  };
}

export function normalizeXlogRow(raw: RawXlogRow): DbXlogRow {
  const fromDetails = parseDetails(raw);
  const fromAction = parseActionField(String(raw.action));

  const utilisateur =
    (raw.utilisateur as string | null | undefined) ??
    (raw.utlisateur as string | null | undefined) ??
    null;

  const created_at = String(
    raw.created_at ?? raw["created at"] ?? new Date().toISOString()
  );

  const created_by =
    (raw.created_by as string | null | undefined) ??
    (raw["created by"] as string | null | undefined) ??
    null;

  const action = (fromAction.action ?? raw.action) as ActivityAction;

  return {
    id: raw.id,
    utilisateur,
    action,
    created_at,
    created_by,
    entity_type:
      (raw.entity_type as ActivityEntityType | undefined) ??
      fromDetails.entity_type ??
      fromAction.entity_type ??
      "configuration",
    entity_id:
      (raw.entity_id as string | null | undefined) ??
      fromDetails.entity_id ??
      null,
    entity_label:
      (raw.entity_label as string | null | undefined) ??
      fromDetails.entity_label ??
      null,
    summary:
      (raw.summary as string | undefined) ??
      fromDetails.summary ??
      fromAction.summary ??
      String(raw.action),
    payload_before:
      (raw.payload_before as Record<string, unknown> | null | undefined) ??
      fromDetails.payload_before ??
      null,
    payload_after:
      (raw.payload_after as Record<string, unknown> | null | undefined) ??
      fromDetails.payload_after ??
      null,
    undone_at:
      (raw.undone_at as string | null | undefined) ??
      fromDetails.undone_at ??
      null,
    undone_by:
      (raw.undone_by as string | null | undefined) ??
      fromDetails.undone_by ??
      null,
  };
}

export function rowToActivityLog(raw: RawXlogRow): ActivityLogEntry {
  const fromDetails = parseDetails(raw);
  const row = normalizeXlogRow(raw);
  const changes =
    fromDetails.changes ??
    resolveActivityChanges({
      action: row.action,
      entityType: row.entity_type,
      payloadBefore: row.payload_before,
      payloadAfter: row.payload_after,
    });
  return {
    id: String(row.id),
    utilisateur: row.utilisateur,
    action: row.action,
    createdAt: row.created_at,
    createdBy: row.created_by,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    summary: row.summary,
    payloadBefore: row.payload_before,
    payloadAfter: row.payload_after,
    changes,
    undoneAt: row.undone_at,
    undoneBy: row.undone_by,
    canUndo: canUndoRow(row),
  };
}

export function canUndoRow(row: DbXlogRow): boolean {
  if (row.undone_at) return false;
  if (row.action === "connexion" || row.action === "annulation") return false;
  if (row.action === "insertion") return Boolean(row.entity_id && row.payload_after);
  if (row.action === "modification" || row.action === "desactivation" || row.action === "activation") {
    return Boolean(row.payload_before);
  }
  if (row.action === "suppression") return Boolean(row.payload_before);
  return false;
}
