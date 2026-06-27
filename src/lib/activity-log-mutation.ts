import type {
  ActivityAction,
  ActivityEntityType,
} from "../../database/migrations/025_xlog.types";
import { resolveActivityChanges } from "@/lib/activity-log-diff";
import { getActivityActor } from "@/lib/activity-actor";
import { insertXlogRow } from "@/lib/repositories/xlog";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type LogMutationInput = {
  utilisateur?: string;
  createdBy?: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
  payloadBefore?: Record<string, unknown> | null;
  payloadAfter?: Record<string, unknown> | null;
};

let suppressDepth = 0;

/** Exécute une opération sans journaliser (ex. annulation d'une action). */
export async function runWithoutActivityLog<T>(fn: () => Promise<T>): Promise<T> {
  suppressDepth += 1;
  try {
    return await fn();
  } finally {
    suppressDepth -= 1;
  }
}

function isActivityLogSuppressed(): boolean {
  return suppressDepth > 0;
}

/** Écrit une entrée dans Xlog (await — ne pas fire-and-forget). */
export async function logMutation(input: LogMutationInput): Promise<void> {
  if (isActivityLogSuppressed()) return;

  const actor = input.utilisateur ?? input.createdBy ?? (await getActivityActor()) ?? "system";
  const changes = resolveActivityChanges({
    action: input.action,
    entityType: input.entityType,
    payloadBefore: input.payloadBefore ?? null,
    payloadAfter: input.payloadAfter ?? null,
  });

  try {
    if (isSupabaseConfigured()) {
      await insertXlogRow({
        utilisateur: actor,
        action: input.action,
        createdBy: actor,
        entityType: input.entityType,
        entityId: input.entityId,
        entityLabel: input.entityLabel,
        summary: input.summary,
        payloadBefore: input.payloadBefore ?? null,
        payloadAfter: input.payloadAfter ?? null,
        changes,
      });
      return;
    }

    const { appendLocalActivityLog } = await import("@/lib/store");
    await appendLocalActivityLog({
      utilisateur: actor,
      action: input.action,
      createdBy: actor,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      entityLabel: input.entityLabel ?? null,
      summary: input.summary,
      payloadBefore: input.payloadBefore ?? null,
      payloadAfter: input.payloadAfter ?? null,
      changes,
      undoneAt: null,
      undoneBy: null,
    });
  } catch (error) {
    console.error("[activity-log] logMutation failed:", error);
  }
}

export function snapshot<T>(value: T): Record<string, unknown> {
  return structuredClone(value) as Record<string, unknown>;
}
