import type {
  ActivityAction,
  ActivityEntityType,
} from "../../database/migrations/025_xlog.types";
import { restoreUtilisateur, updateUtilisateur } from "@/lib/auth/users";
import {
  createFormationInDb,
  deleteFormationInDb,
  updateFormationInDb,
} from "@/lib/repositories/formations";
import { computeActivityChanges, resolveActivityChanges } from "@/lib/activity-log-diff";
import {
  deleteXlogRow,
  getXlogRowById,
  insertXlogRow,
  listDistinctXlogUsers,
  listXlogRows,
  markXlogUndone,
  type ListXlogFilters,
} from "@/lib/repositories/xlog";
import { canUndoRow } from "@/lib/repositories/xlog/mapper";
import type { DbXlogRow } from "../../database/migrations/025_xlog.types";
import {
  appendLocalActivityLog,
  deleteLocalActivityLog,
  getLocalActivityLogById,
  listLocalActivityLogUsers,
  listLocalActivityLogs,
  markLocalActivityLogUndone,
} from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ActivityLogEntry, Departement, Employee, JobPosition, Utilisateur } from "@/lib/types";
import type { CongeWithEmployee } from "@/lib/types";
import {
  createDepartement,
  createEmployee,
  createPosition,
  deleteConge,
  deleteDepartement,
  deleteEmployee,
  deleteMovement,
  deletePosition,
  saveCongeForEmployee,
  saveDepartement,
  saveEmployee,
  savePosition,
  updateSettings,
} from "@/lib/store";
import { deleteUtilisateur } from "@/lib/auth/users";
import type { AppSettings } from "@/lib/types";
import type { FormationRecord } from "@/lib/types";
import type { Movement } from "@/lib/types";
import type { PermissionMatrix } from "@/lib/permissions";

export type RecordActivityInput = {
  utilisateur: string;
  createdBy: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
  payloadBefore?: Record<string, unknown> | null;
  payloadAfter?: Record<string, unknown> | null;
};

export { ACTIVITY_ACTION_LABELS, ACTIVITY_ENTITY_LABELS } from "./activity-log-labels";

function usesDb(): boolean {
  return isSupabaseConfigured();
}

/** Enregistre une action (ne bloque pas l'appelant en cas d'erreur). */
export async function recordActivity(input: RecordActivityInput): Promise<ActivityLogEntry | null> {
  try {
    const changes =
      resolveActivityChanges({
        action: input.action,
        entityType: input.entityType,
        payloadBefore: input.payloadBefore ?? null,
        payloadAfter: input.payloadAfter ?? null,
      });

    if (usesDb()) {
      return await insertXlogRow({
        utilisateur: input.utilisateur,
        action: input.action,
        createdBy: input.createdBy,
        entityType: input.entityType,
        entityId: input.entityId,
        entityLabel: input.entityLabel,
        summary: input.summary,
        payloadBefore: input.payloadBefore ?? null,
        payloadAfter: input.payloadAfter ?? null,
        changes,
      });
    }
    return await appendLocalActivityLog({
      utilisateur: input.utilisateur,
      action: input.action,
      createdBy: input.createdBy,
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
    console.error("[activity-log] record failed:", error);
    return null;
  }
}

export async function listActivityLogs(
  filters: ListXlogFilters = {}
): Promise<ActivityLogEntry[]> {
  if (usesDb()) return listXlogRows(filters);
  return listLocalActivityLogs(filters);
}

export async function listActivityLogUsers(): Promise<string[]> {
  if (usesDb()) return listDistinctXlogUsers();
  return listLocalActivityLogUsers();
}

export async function getActivityLog(id: string): Promise<ActivityLogEntry | null> {
  if (usesDb()) return getXlogRowById(id);
  const entry = await getLocalActivityLogById(id);
  if (!entry) return null;
  return {
    ...entry,
    changes:
      entry.changes ??
      computeActivityChanges(entry.payloadBefore, entry.payloadAfter),
  };
}

export async function deleteActivityLog(id: string): Promise<boolean> {
  if (usesDb()) return deleteXlogRow(id);
  return deleteLocalActivityLog(id);
}

export async function undoActivity(
  id: string,
  actorUsername: string
): Promise<ActivityLogEntry> {
  const entry = await getActivityLog(id);
  if (!entry) throw new Error("Entrée de journal introuvable");
  if (!entry.canUndo) throw new Error("Cette action ne peut pas être annulée");

  const { runWithoutActivityLog } = await import("@/lib/activity-log-mutation");
  await runWithoutActivityLog(() => executeUndo(entry));

  if (usesDb()) {
    const undone = await markXlogUndone(id, actorUsername);
    await recordActivity({
      utilisateur: actorUsername,
      createdBy: actorUsername,
      action: "annulation",
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityLabel: entry.entityLabel,
      summary: `Annulation : ${entry.summary}`,
      payloadBefore: { logId: entry.id, originalAction: entry.action },
      payloadAfter: null,
    });
    return undone;
  }

  const undone = await markLocalActivityLogUndone(id, actorUsername);
  await recordActivity({
    utilisateur: actorUsername,
    createdBy: actorUsername,
    action: "annulation",
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityLabel: entry.entityLabel,
    summary: `Annulation : ${entry.summary}`,
    payloadBefore: { logId: entry.id, originalAction: entry.action },
    payloadAfter: null,
  });
  return undone;
}

async function executeUndo(entry: ActivityLogEntry): Promise<void> {
  switch (entry.entityType) {
    case "utilisateur":
      return undoUtilisateur(entry);
    case "employe":
      return undoEmploye(entry);
    case "departement":
      return undoDepartement(entry);
    case "poste":
      return undoPoste(entry);
    case "conge":
      return undoConge(entry);
    case "formation":
      return undoFormation(entry);
    case "mouvement":
      return undoMouvement(entry);
    case "configuration":
      return undoConfiguration(entry);
    default:
      throw new Error("Type d'entité non pris en charge pour l'annulation");
  }
}

async function undoUtilisateur(entry: ActivityLogEntry): Promise<void> {
  const before = entry.payloadBefore as (Utilisateur & { passeword?: string }) | null;
  const after = entry.payloadAfter as Utilisateur | null;

  switch (entry.action) {
    case "insertion": {
      if (!entry.entityId) throw new Error("Identifiant manquant");
      await deleteUtilisateur(entry.entityId);
      return;
    }
    case "suppression": {
      if (!before?.passeword) throw new Error("Données de restauration incomplètes");
      await restoreUtilisateur(
        {
          id: entry.entityId ?? "0",
          username: before.username,
          passeword: before.passeword,
          matriculAgent: before.matriculAgent ?? null,
          permissions: (before.permissions ?? {}) as PermissionMatrix,
          actif: before.actif ?? true,
          createdAt: before.createdAt ?? new Date().toISOString(),
          createdBy: before.createdBy ?? null,
          updatedAt: before.updatedAt ?? new Date().toISOString(),
          updatedBy: before.updatedBy ?? null,
        },
        { createdBy: entry.utilisateur ?? "system" }
      );
      return;
    }
    case "modification":
    case "desactivation":
    case "activation": {
      if (!entry.entityId || !before) throw new Error("Données de restauration incomplètes");
      await updateUtilisateur(
        entry.entityId,
        {
          username: before.username,
          matriculAgent: before.matriculAgent,
          permissions: before.permissions as PermissionMatrix,
          actif: before.actif,
        },
        { updatedBy: entry.utilisateur ?? "system" }
      );
      return;
    }
    default:
      throw new Error(`Action « ${entry.action} » non annulable pour utilisateur`);
  }
}

async function undoEmploye(entry: ActivityLogEntry): Promise<void> {
  const before = entry.payloadBefore as Employee | null;
  const after = entry.payloadAfter as Employee | null;

  switch (entry.action) {
    case "insertion": {
      if (!entry.entityId) throw new Error("Identifiant manquant");
      await deleteEmployee(entry.entityId);
      return;
    }
    case "suppression": {
      if (!before) throw new Error("Données de restauration incomplètes");
      await saveEmployee(before);
      return;
    }
    case "modification": {
      if (!before) throw new Error("Données de restauration incomplètes");
      await saveEmployee(before);
      return;
    }
    default:
      throw new Error(`Action « ${entry.action} » non annulable pour employé`);
  }
}

async function undoDepartement(entry: ActivityLogEntry): Promise<void> {
  const before = entry.payloadBefore as Departement | null;

  switch (entry.action) {
    case "insertion": {
      if (!entry.entityId) throw new Error("Identifiant manquant");
      await deleteDepartement(entry.entityId);
      return;
    }
    case "suppression": {
      if (!before) throw new Error("Données de restauration incomplètes");
      await createDepartement({
        code: before.code,
        libelle: before.libelle,
        ordre: before.ordre,
        actif: before.actif,
        description: before.description,
      });
      return;
    }
    case "modification": {
      if (!before) throw new Error("Données de restauration incomplètes");
      await saveDepartement(before);
      return;
    }
    default:
      throw new Error(`Action « ${entry.action} » non annulable pour département`);
  }
}

async function undoPoste(entry: ActivityLogEntry): Promise<void> {
  const before = entry.payloadBefore as JobPosition | null;

  switch (entry.action) {
    case "insertion": {
      if (!entry.entityId) throw new Error("Identifiant manquant");
      await deletePosition(entry.entityId);
      return;
    }
    case "suppression": {
      if (!before) throw new Error("Données de restauration incomplètes");
      const { id: _id, createdAt: _c, updatedAt: _u, ...partial } = before;
      await createPosition(partial);
      return;
    }
    case "modification": {
      if (!before) throw new Error("Données de restauration incomplètes");
      await savePosition(before);
      return;
    }
    default:
      throw new Error(`Action « ${entry.action} » non annulable pour poste`);
  }
}

async function undoConge(entry: ActivityLogEntry): Promise<void> {
  const before = entry.payloadBefore as CongeWithEmployee | null;

  switch (entry.action) {
    case "insertion": {
      if (!entry.entityId) throw new Error("Identifiant manquant");
      await deleteConge(entry.entityId);
      return;
    }
    case "suppression": {
      if (!before?.employeeId) throw new Error("Données de restauration incomplètes");
      await saveCongeForEmployee(before.employeeId, {
        id: before.id,
        type: before.type,
        startDate: before.startDate,
        endDate: before.endDate,
        status: before.status,
        notes: before.notes,
        validateur1: before.validateur1,
        validateur2: before.validateur2,
      });
      return;
    }
    case "modification": {
      if (!before?.employeeId) throw new Error("Données de restauration incomplètes");
      await saveCongeForEmployee(before.employeeId, {
        id: before.id,
        type: before.type,
        startDate: before.startDate,
        endDate: before.endDate,
        status: before.status,
        notes: before.notes,
        validateur1: before.validateur1,
        validateur2: before.validateur2,
      });
      return;
    }
    default:
      throw new Error(`Action « ${entry.action} » non annulable pour congé`);
  }
}

async function undoFormation(entry: ActivityLogEntry): Promise<void> {
  const before = entry.payloadBefore as FormationRecord | null;

  switch (entry.action) {
    case "insertion": {
      if (!entry.entityId) throw new Error("Identifiant manquant");
      await deleteFormationInDb(Number(entry.entityId));
      return;
    }
    case "suppression": {
      if (!before) throw new Error("Données de restauration incomplètes");
      await createFormationInDb({
        titre: before.titre,
        date_debut: before.dateDebut,
        date_fin: before.dateFin,
        niveau: before.niveau ?? null,
        instructeur: before.instructeur ?? null,
        commentaire: before.commentaire ?? null,
        participation: before.participants ?? [],
      });
      return;
    }
    case "modification": {
      if (!entry.entityId || !before) throw new Error("Données de restauration incomplètes");
      await updateFormationInDb(Number(entry.entityId), {
        titre: before.titre,
        date_debut: before.dateDebut,
        date_fin: before.dateFin,
        niveau: before.niveau ?? null,
        instructeur: before.instructeur ?? null,
        commentaire: before.commentaire ?? null,
        participation: before.participants ?? [],
      });
      return;
    }
    default:
      throw new Error(`Action « ${entry.action} » non annulable pour formation`);
  }
}

async function undoMouvement(entry: ActivityLogEntry): Promise<void> {
  const before = entry.payloadBefore as {
    employeeId?: string;
    movement?: Movement;
    employee?: Employee;
  } | null;
  const after = entry.payloadAfter as {
    employeeId?: string;
    movement?: Movement;
    employee?: Employee;
  } | null;

  switch (entry.action) {
    case "insertion": {
      const employeeId =
        after?.employeeId ?? before?.employeeId ?? entry.entityId?.split(":")[0];
      const movementId = after?.movement?.id ?? entry.entityId?.split(":")[1];
      if (!employeeId || !movementId) throw new Error("Données de restauration incomplètes");
      await deleteMovement(employeeId, movementId);
      if (before?.employee) await saveEmployee(before.employee as Employee);
      return;
    }
    case "suppression": {
      if (!before?.employeeId || !before.movement) {
        throw new Error("Données de restauration incomplètes");
      }
      const employee = (await import("@/lib/store").then((m) =>
        m.getEmployee(before.employeeId!)
      )) as Employee | null;
      if (!employee) throw new Error("Employé introuvable");
      employee.movements = [...employee.movements, before.movement as Movement];
      if (before.employee) {
        await saveEmployee(before.employee as Employee);
      } else {
        await saveEmployee(employee);
      }
      return;
    }
    case "modification": {
      if (!before?.employee) throw new Error("Données de restauration incomplètes");
      await saveEmployee(before.employee as Employee);
      return;
    }
    default:
      throw new Error(`Action « ${entry.action} » non annulable pour mouvement`);
  }
}

async function undoConfiguration(entry: ActivityLogEntry): Promise<void> {
  const before = entry.payloadBefore as { settings?: AppSettings } | null;
  if (!before?.settings) throw new Error("Données de restauration incomplètes");
  await updateSettings(before.settings);
}

/** Masque les données sensibles pour l'affichage API. */
export function sanitizeLogForApi(entry: ActivityLogEntry): ActivityLogEntry {
  const strip = (payload: Record<string, unknown> | null) => {
    if (!payload) return null;
    const clone = structuredClone(payload);
    delete clone.passeword;
    delete clone.password;
    return clone;
  };
  const payloadBefore = strip(entry.payloadBefore);
  const payloadAfter = strip(entry.payloadAfter);
  return {
    ...entry,
    payloadBefore,
    payloadAfter,
    changes:
      entry.changes ?? computeActivityChanges(payloadBefore, payloadAfter),
  };
}

/** Helper pour les routes API — journalise sans faire échouer la requête. */
export async function logApiActivity(
  username: string,
  input: Omit<RecordActivityInput, "utilisateur" | "createdBy">
): Promise<void> {
  const { logMutation } = await import("@/lib/activity-log-mutation");
  await logMutation({
    ...input,
    utilisateur: username,
    createdBy: username,
  });
}

export function snapshot<T extends object>(value: T): Record<string, unknown> {
  return structuredClone(value) as Record<string, unknown>;
}

/** Vérifie canUndo pour une entrée locale. */
export function localCanUndo(entry: ActivityLogEntry): boolean {
  const row: DbXlogRow = {
    id: Number(entry.id) || 0,
    utilisateur: entry.utilisateur,
    action: entry.action,
    created_at: entry.createdAt,
    created_by: entry.createdBy,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    entity_label: entry.entityLabel,
    summary: entry.summary,
    payload_before: entry.payloadBefore,
    payload_after: entry.payloadAfter,
    undone_at: entry.undoneAt,
    undone_by: entry.undoneBy,
  };
  return canUndoRow(row);
}
