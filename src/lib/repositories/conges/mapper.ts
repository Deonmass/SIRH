import type { DbCongeRow } from "../../../../database/migrations/010_conges.types";
import { parseValidatorField, toDbValidatorField } from "@/lib/conges-validateur-field";
import type { CongeWithEmployee, LeaveRecord, LeaveRequestStatus, LeaveType } from "@/lib/types";

export function congeIdToApp(id: number): string {
  return String(id);
}

export function congeIdFromApp(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Identifiant congé invalide : ${id}`);
  }
  return n;
}

export function rowToLeaveRecord(row: DbCongeRow): LeaveRecord {
  const v1 = parseValidatorField(row.validateur_1);
  const v2 = parseValidatorField(row.validateur_2);
  return {
    id: congeIdToApp(row.id),
    type: row.type as LeaveType,
    startDate: row.date_debut,
    endDate: row.date_fin,
    days: row.jours,
    status: row.statut as LeaveRequestStatus,
    notes: row.notes ?? undefined,
    validateur1: v1.userId || null,
    validateur2: v2.userId || null,
    validation1At: v1.validatedAt,
    validation2At: v2.validatedAt,
    matriculeEmploye: row.matricule_employe,
    createdAt: row.cree_le,
    updatedAt: row.modif_le,
  };
}

export function leaveToInsertRow(input: {
  matricule_employe: string;
  type: LeaveType;
  date_debut: string;
  date_fin: string;
  jours: number;
  statut?: LeaveRequestStatus;
  notes?: string | null;
  validateur_1?: string | null;
  validateur_2?: string | null;
  cree_par?: string | null;
}): Omit<DbCongeRow, "id" | "cree_le" | "modif_le" | "modif_par"> {
  return {
    matricule_employe: input.matricule_employe,
    type: input.type,
    date_debut: input.date_debut,
    date_fin: input.date_fin,
    jours: input.jours,
    statut: input.statut ?? "demande",
    notes: input.notes ?? null,
    validateur_1: input.validateur_1 ?? null,
    validateur_2: input.validateur_2 ?? null,
    cree_par: input.cree_par ?? null,
  };
}

export function leaveToUpdateRow(input: {
  type: LeaveType;
  date_debut: string;
  date_fin: string;
  jours: number;
  statut: LeaveRequestStatus;
  notes?: string | null;
  validateur_1?: string | null;
  validateur_2?: string | null;
  modif_par?: string | null;
}): Pick<
  DbCongeRow,
  | "type"
  | "date_debut"
  | "date_fin"
  | "jours"
  | "statut"
  | "notes"
  | "validateur_1"
  | "validateur_2"
  | "modif_par"
> {
  return {
    type: input.type,
    date_debut: input.date_debut,
    date_fin: input.date_fin,
    jours: input.jours,
    statut: input.statut,
    notes: input.notes ?? null,
    validateur_1: input.validateur_1 ?? null,
    validateur_2: input.validateur_2 ?? null,
    modif_par: input.modif_par ?? null,
  };
}

/** Prépare validateur_1 / validateur_2 pour écriture Supabase. */
export function validatorsToDbRow(input: {
  validateur1?: string | null;
  validateur2?: string | null;
  validation1At?: string | null;
  validation2At?: string | null;
}): { validateur_1: string | null; validateur_2: string | null } {
  return {
    validateur_1: toDbValidatorField(input.validateur1, input.validation1At),
    validateur_2: toDbValidatorField(input.validateur2, input.validation2At),
  };
}
