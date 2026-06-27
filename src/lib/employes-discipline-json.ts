import type {
  DbDisciplinaryEntryJson,
  DbEmployeDisciplineJson,
} from "../../database/migrations/018_employes_discipline.types";
import type { DisciplinaryRecord } from "@/lib/types";

export type EmployeDisciplinePayload = DbEmployeDisciplineJson;

export const EMPTY_EMPLOYE_DISCIPLINE: EmployeDisciplinePayload = {
  historique: [],
};

export function parseEmployeDiscipline(
  raw: string | null | undefined
): EmployeDisciplinePayload {
  if (!raw?.trim()) return { ...EMPTY_EMPLOYE_DISCIPLINE };
  try {
    const data = JSON.parse(raw) as Partial<DbEmployeDisciplineJson>;
    return {
      historique: Array.isArray(data.historique) ? data.historique : [],
    };
  } catch {
    return { ...EMPTY_EMPLOYE_DISCIPLINE };
  }
}

export function encodeEmployeDiscipline(payload: EmployeDisciplinePayload): string {
  return JSON.stringify({
    historique: payload.historique ?? [],
  });
}

export function isEmployeDisciplineEmpty(payload: EmployeDisciplinePayload): boolean {
  return (payload.historique?.length ?? 0) === 0;
}

export function disciplinaryEntryToRecord(entry: DbDisciplinaryEntryJson): DisciplinaryRecord {
  return {
    id: entry.id,
    type: entry.type,
    date: entry.date,
    effectiveDate: entry.date_effet ?? undefined,
    endDate: entry.date_fin ?? undefined,
    reason: entry.motif,
    facts: entry.faits,
    legalBasis: entry.base_legale ?? undefined,
    issuedBy: entry.emis_par ?? undefined,
    employeeResponse: entry.reponse_employe ?? undefined,
    acknowledged: entry.reconnu,
    acknowledgedAt: entry.reconnu_le ?? undefined,
    linkedDocumentId: entry.document_lie_id ?? undefined,
    severity: entry.severite,
    status: entry.statut,
  };
}

export function disciplinaryRecordToEntry(
  record: DisciplinaryRecord,
  existing?: DbDisciplinaryEntryJson
): DbDisciplinaryEntryJson {
  const now = new Date().toISOString();
  return {
    id: record.id,
    type: record.type,
    date: record.date,
    date_effet: record.effectiveDate ?? null,
    date_fin: record.endDate ?? null,
    motif: record.reason,
    faits: record.facts,
    base_legale: record.legalBasis ?? null,
    emis_par: record.issuedBy ?? null,
    reponse_employe: record.employeeResponse ?? null,
    reconnu: record.acknowledged,
    reconnu_le: record.acknowledgedAt ?? null,
    document_lie_id: record.linkedDocumentId ?? null,
    severite: record.severity,
    statut: record.status,
    cree_le: existing?.cree_le ?? now,
    modif_le: now,
  };
}

export function listDisciplinaryRecordsFromPayload(
  payload: EmployeDisciplinePayload
): DisciplinaryRecord[] {
  return (payload.historique ?? []).map(disciplinaryEntryToRecord);
}

export function disciplinaryRecordsToPayload(
  records: DisciplinaryRecord[],
  existing?: EmployeDisciplinePayload
): EmployeDisciplinePayload {
  const byId = new Map((existing?.historique ?? []).map((e) => [e.id, e]));
  return {
    historique: records.map((r) => disciplinaryRecordToEntry(r, byId.get(r.id))),
  };
}
