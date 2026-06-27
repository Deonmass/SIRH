export type ActivityFieldChange = {
  before: unknown;
  after: unknown;
};

export type ActivityChanges = Record<string, ActivityFieldChange>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("__")) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      Object.assign(result, flattenObject(value, path));
    } else {
      result[path] = value;
    }
  }
  return result;
}

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Compare deux snapshots et retourne les champs modifiés (aplatis). */
export function computeActivityChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): ActivityChanges | null {
  if (!before && !after) return null;
  if (!before && after) {
    return changesFromSingleSnapshot(after, "after");
  }
  if (before && !after) {
    return changesFromSingleSnapshot(before, "before");
  }
  if (!before || !after) return null;

  const flatBefore = flattenObject(before);
  const flatAfter = flattenObject(after);
  const keys = new Set([...Object.keys(flatBefore), ...Object.keys(flatAfter)]);
  const changes: ActivityChanges = {};

  for (const key of keys) {
    const b = flatBefore[key];
    const a = flatAfter[key];
    if (stableStringify(b) !== stableStringify(a)) {
      changes[key] = { before: b ?? null, after: a ?? null };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

function changesFromSingleSnapshot(
  snapshot: Record<string, unknown>,
  mode: "before" | "after"
): ActivityChanges | null {
  const flat = flattenObject(snapshot);
  const changes: ActivityChanges = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value === undefined) continue;
    changes[key] =
      mode === "after"
        ? { before: null, after: value }
        : { before: value, after: null };
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

function filterChangesForEntity(
  changes: ActivityChanges,
  entityType: string
): ActivityChanges {
  if (entityType !== "mouvement") return changes;
  const filtered: ActivityChanges = {};
  for (const [key, value] of Object.entries(changes)) {
    if (
      key.startsWith("movement.") ||
      key === "employeeId" ||
      key.startsWith("employee.matricule") ||
      key.startsWith("employee.prenom") ||
      key.startsWith("employee.nom") ||
      key.startsWith("employee.department") ||
      key.startsWith("employee.position")
    ) {
      filtered[key] = value;
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : changes;
}

/** Résout les changements selon le type d'action (insertion, suppression, modification). */
export function resolveActivityChanges(entry: {
  action: string;
  entityType: string;
  payloadBefore: Record<string, unknown> | null;
  payloadAfter: Record<string, unknown> | null;
  changes?: ActivityChanges | null;
}): ActivityChanges | null {
  if (entry.changes && Object.keys(entry.changes).length > 0) {
    return filterChangesForEntity(entry.changes, entry.entityType);
  }
  if (entry.action === "insertion" && entry.payloadAfter) {
    const raw = changesFromSingleSnapshot(entry.payloadAfter, "after");
    return raw ? filterChangesForEntity(raw, entry.entityType) : null;
  }
  if (entry.action === "suppression" && entry.payloadBefore) {
    const raw = changesFromSingleSnapshot(entry.payloadBefore, "before");
    return raw ? filterChangesForEntity(raw, entry.entityType) : null;
  }
  const computed = computeActivityChanges(entry.payloadBefore, entry.payloadAfter);
  return computed ? filterChangesForEntity(computed, entry.entityType) : null;
}

/** Résumé JSON enrichi pour affichage. */
export function buildActivityDetailJson(entry: {
  id?: string;
  action: string;
  entityType?: string;
  entityId?: string | null;
  entityLabel?: string | null;
  summary?: string;
  utilisateur?: string | null;
  createdAt?: string;
  createdBy?: string | null;
  undoneAt?: string | null;
  undoneBy?: string | null;
  payloadBefore: Record<string, unknown> | null;
  payloadAfter: Record<string, unknown> | null;
  changes?: ActivityChanges | null;
}): Record<string, unknown> {
  const changes = resolveActivityChanges({
    action: entry.action,
    entityType: entry.entityType ?? "configuration",
    payloadBefore: entry.payloadBefore,
    payloadAfter: entry.payloadAfter,
    changes: entry.changes,
  });

  return {
    meta: {
      id: entry.id ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      entityLabel: entry.entityLabel ?? null,
      summary: entry.summary ?? null,
      utilisateur: entry.utilisateur ?? null,
      createdAt: entry.createdAt ?? null,
      createdBy: entry.createdBy ?? null,
      undoneAt: entry.undoneAt ?? null,
      undoneBy: entry.undoneBy ?? null,
      changedFieldCount: changes ? Object.keys(changes).length : 0,
    },
    before: entry.payloadBefore,
    after: entry.payloadAfter,
    changes: changes ?? {},
  };
}
