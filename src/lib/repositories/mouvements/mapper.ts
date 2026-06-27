import type {
  DbMouvementRow,
  DbTypeMouvement,
} from "../../../../database/migrations/004_mouvements.types";
import { TYPE_MOUVEMENT_LABELS } from "../../../../database/migrations/004_mouvements.types";
import { parseMovementAttachments } from "@/lib/movement-attachments";
import type { Movement } from "@/lib/types";

export function mouvementIdToApp(id: number): string {
  return String(id);
}

export function mouvementIdFromApp(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Identifiant de mouvement invalide : ${id}`);
  }
  return n;
}

export function rowToMovement(row: DbMouvementRow, employeeId: string): Movement {
  return {
    id: mouvementIdToApp(row.id),
    employeeId,
    code: row.code_mouvement,
    type: row.type_mouvement,
    date: row.date_mouvement,
    effectiveDate: row.date_mouvement,
    reason: TYPE_MOUVEMENT_LABELS[row.type_mouvement],
    positionCode: row.code_poste,
    documentAnnexe: row.document_annexe,
    documentAnnexes: parseMovementAttachments(row.document_annexe),
    createdAt: row.cree_le,
    updatedAt: row.modif_le,
    createdBy: row.cree_par,
    updatedBy: row.modif_par,
  };
}

export function movementToInsertRow(input: {
  code_mouvement: string;
  matricule_employe: string;
  code_poste?: string | null;
  type_mouvement: DbTypeMouvement;
  date_mouvement: string;
  document_annexe?: string | null;
  cree_par?: string | null;
}): Omit<DbMouvementRow, "id" | "cree_le" | "modif_le" | "modif_par"> {
  return {
    code_mouvement: input.code_mouvement,
    matricule_employe: input.matricule_employe,
    code_poste: input.code_poste ?? null,
    type_mouvement: input.type_mouvement,
    date_mouvement: input.date_mouvement,
    document_annexe: input.document_annexe ?? null,
    cree_par: input.cree_par ?? null,
  };
}

export function movementToUpdateRow(input: {
  code_poste?: string | null;
  type_mouvement: DbTypeMouvement;
  date_mouvement: string;
  document_annexe?: string | null;
  modif_par?: string | null;
}): Pick<
  DbMouvementRow,
  "code_poste" | "type_mouvement" | "date_mouvement" | "document_annexe" | "modif_par"
> {
  return {
    code_poste: input.code_poste ?? null,
    type_mouvement: input.type_mouvement,
    date_mouvement: input.date_mouvement,
    document_annexe: input.document_annexe ?? null,
    modif_par: input.modif_par ?? null,
  };
}

export function mergeMovementWithDbRow(
  row: DbMouvementRow,
  employeeId: string,
  existing?: Movement
): Movement {
  const base = rowToMovement(row, employeeId);
  if (!existing) return base;
  return {
    ...existing,
    ...base,
    fromPosition: existing.fromPosition,
    toPosition: existing.toPosition,
    fromDepartment: existing.fromDepartment,
    toDepartment: existing.toDepartment,
    fromSalary: existing.fromSalary,
    toSalary: existing.toSalary,
    reason: existing.reason || base.reason,
    legalBasis: existing.legalBasis,
    approvedBy: existing.approvedBy,
  };
}
