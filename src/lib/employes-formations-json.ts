import type {
  DbEmployeFormationJson,
  DbEmployeFormationsJson,
} from "../../database/migrations/016_employes_formations.types";
import type { EmployeeFormationRecord } from "@/lib/types";

export type EmployeFormationsPayload = DbEmployeFormationsJson;

export const EMPTY_EMPLOYE_FORMATIONS: EmployeFormationsPayload = {
  formations: [],
};

export function parseEmployeFormations(
  raw: string | null | undefined
): EmployeFormationsPayload {
  if (!raw?.trim()) return { ...EMPTY_EMPLOYE_FORMATIONS };
  try {
    const data = JSON.parse(raw) as Partial<DbEmployeFormationsJson>;
    return {
      formations: Array.isArray(data.formations) ? data.formations : [],
    };
  } catch {
    return { ...EMPTY_EMPLOYE_FORMATIONS };
  }
}

export function encodeEmployeFormations(payload: EmployeFormationsPayload): string {
  return JSON.stringify({
    formations: payload.formations ?? [],
  });
}

export function formationEntryToRecord(entry: DbEmployeFormationJson): EmployeeFormationRecord {
  return {
    id: entry.id,
    label: entry.titre,
    provider: entry.instructeur ?? undefined,
    startDate: entry.date_debut ?? undefined,
    endDate: entry.date_fin ?? undefined,
    completed: entry.participation ?? false,
    evaluationComment: entry.commentaire ?? undefined,
  };
}

export function formationRecordToEntry(
  record: EmployeeFormationRecord,
  niveau?: string | null
): DbEmployeFormationJson {
  const now = new Date().toISOString();
  return {
    id: record.id,
    titre: record.label,
    date_debut: record.startDate ?? null,
    date_fin: record.endDate ?? null,
    niveau: niveau ?? null,
    instructeur: record.provider ?? null,
    commentaire: record.evaluationComment ?? null,
    participation: record.completed,
    cree_le: now,
    modif_le: now,
  };
}

export function listFormationRecordsFromPayload(
  payload: EmployeFormationsPayload
): EmployeeFormationRecord[] {
  return (payload.formations ?? []).map(formationEntryToRecord);
}
