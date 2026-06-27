import type {
  DbEmployeCongeEntryJson,
  DbEmployeCongesHistoriqueJson,
  DbEmployeCongesJson,
} from "../../database/migrations/014_employes_conges.types";
import { parseValidatorField, toDbValidatorField } from "@/lib/conges-validateur-field";
import type { LeaveRecord, LeaveRequestStatus, LeaveType } from "@/lib/types";
import type { SoldeCongePayload } from "@/lib/conges-balance";

export type EmployeCongesPayload = DbEmployeCongesJson;

export const EMPTY_EMPLOYE_CONGES: EmployeCongesPayload = {
  conges: [],
  historique: [],
};

/** Colonne `employes.conges` (ou alias legacy `conge`). */
export function readEmployeCongesColumnRaw(
  row: { conges?: string | null; conge?: string | null }
): string | null {
  return row.conges ?? row.conge ?? null;
}

export function parseEmployeConges(
  raw: string | null | undefined
): EmployeCongesPayload {
  if (!raw?.trim()) return { ...EMPTY_EMPLOYE_CONGES };
  try {
    const data = JSON.parse(raw) as Partial<DbEmployeCongesJson>;
    return {
      conges: Array.isArray(data.conges) ? data.conges : [],
      historique: Array.isArray(data.historique) ? data.historique : [],
    };
  } catch {
    return { ...EMPTY_EMPLOYE_CONGES };
  }
}

export function encodeEmployeConges(payload: EmployeCongesPayload): string {
  return JSON.stringify({
    conges: payload.conges ?? [],
    historique: payload.historique ?? [],
  });
}

export function isEmployeCongesEmpty(payload: EmployeCongesPayload): boolean {
  return (payload.conges?.length ?? 0) === 0 && (payload.historique?.length ?? 0) === 0;
}

export function congeEntryToLeaveRecord(
  entry: DbEmployeCongeEntryJson,
  matricule: string
): LeaveRecord {
  const v1 = parseValidatorField(entry.validateur_1);
  const v2 = parseValidatorField(entry.validateur_2);
  return {
    id: entry.id,
    type: entry.type as LeaveType,
    startDate: entry.date_debut,
    endDate: entry.date_fin,
    days: entry.jours,
    status: entry.statut as LeaveRequestStatus,
    notes: entry.notes ?? undefined,
    validateur1: v1.userId || null,
    validateur2: v2.userId || null,
    validation1At: v1.validatedAt ?? entry.validation_1_at ?? null,
    validation2At: v2.validatedAt ?? entry.validation_2_at ?? null,
    matriculeEmploye: matricule,
    createdAt: entry.cree_le,
    updatedAt: entry.modif_le ?? entry.cree_le,
  };
}

export function leaveRecordToCongeEntry(
  record: LeaveRecord,
  serviceYear: number
): DbEmployeCongeEntryJson {
  const v = {
    validateur1: record.validateur1,
    validateur2: record.validateur2,
    validation1At: record.validation1At,
    validation2At: record.validation2At,
  };
  const dbV = {
    validateur_1: toDbValidatorField(v.validateur1, v.validation1At),
    validateur_2: toDbValidatorField(v.validateur2, v.validation2At),
  };
  const now = new Date().toISOString();
  return {
    id: record.id,
    type: record.type,
    date_debut: record.startDate,
    date_fin: record.endDate,
    jours: record.days,
    statut: record.status,
    notes: record.notes ?? null,
    validateur_1: dbV.validateur_1,
    validateur_2: dbV.validateur_2,
    validation_1_at: record.validation1At ?? null,
    validation_2_at: record.validation2At ?? null,
    cree_le: record.createdAt ?? now,
    modif_le: record.updatedAt ?? now,
    annee: serviceYear,
  };
}

export function listLeaveRecordsFromCongesPayload(
  payload: EmployeCongesPayload,
  matricule: string
): LeaveRecord[] {
  const current = (payload.conges ?? []).map((e) => congeEntryToLeaveRecord(e, matricule));
  const archived = (payload.historique ?? []).flatMap((h) =>
    (h.conges ?? []).map((e) => congeEntryToLeaveRecord(e, matricule))
  );
  return [...current, ...archived].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function congesPayloadToSoldeSlices(payload: EmployeCongesPayload) {
  return (payload.conges ?? []).map((e) => ({
    type: e.type as LeaveType,
    status: e.statut as LeaveRequestStatus,
    days: e.jours,
    startDate: e.date_debut,
    endDate: e.date_fin,
  }));
}

export function upsertCongeInPayload(
  payload: EmployeCongesPayload,
  record: LeaveRecord,
  serviceYear: number
): EmployeCongesPayload {
  const entry = leaveRecordToCongeEntry(record, serviceYear);
  const conges = [...(payload.conges ?? [])];
  const idx = conges.findIndex((c) => c.id === entry.id);
  if (idx >= 0) conges[idx] = entry;
  else conges.push(entry);
  return { ...payload, conges };
}

export function removeCongeFromPayload(
  payload: EmployeCongesPayload,
  congeId: string
): EmployeCongesPayload | null {
  const conges = payload.conges ?? [];
  if (!conges.some((c) => c.id === congeId)) return null;
  return { ...payload, conges: conges.filter((c) => c.id !== congeId) };
}

export function findCongeInPayload(
  payload: EmployeCongesPayload,
  congeId: string,
  matricule: string
): LeaveRecord | null {
  const inCurrent = (payload.conges ?? []).find((c) => c.id === congeId);
  if (inCurrent) return congeEntryToLeaveRecord(inCurrent, matricule);
  for (const h of payload.historique ?? []) {
    const hit = (h.conges ?? []).find((c) => c.id === congeId);
    if (hit) return congeEntryToLeaveRecord(hit, matricule);
  }
  return null;
}

/** Archive la période courante avant réinitialisation annuelle du solde. */
export function archiveCurrentYearConges(
  payload: EmployeCongesPayload,
  solde: SoldeCongePayload
): EmployeCongesPayload {
  const conges = payload.conges ?? [];
  if (conges.length === 0) return payload;
  const historique = [...(payload.historique ?? [])];
  const archive: DbEmployeCongesHistoriqueJson = {
    annee: solde.annee,
    acquis: solde.acquis,
    pris: solde.pris,
    reinit_le: solde.reinit_le,
    conges,
  };
  historique.push(archive);
  return { ...payload, historique, conges: [] };
}

/** Lit d'anciennes données embarquées dans `solde_conge` (migration unique). */
export function parseEmbeddedCongesFromSoldeRaw(
  soldeRaw: string | null | undefined
): EmployeCongesPayload {
  if (!soldeRaw?.trim()) return { ...EMPTY_EMPLOYE_CONGES };
  try {
    const data = JSON.parse(soldeRaw) as Partial<{
      conges: DbEmployeCongeEntryJson[];
      historique: DbEmployeCongesHistoriqueJson[];
    }>;
    return {
      conges: Array.isArray(data.conges) ? data.conges : [],
      historique: Array.isArray(data.historique) ? data.historique : [],
    };
  } catch {
    return { ...EMPTY_EMPLOYE_CONGES };
  }
}
