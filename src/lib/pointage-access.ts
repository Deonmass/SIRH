import { canAccessSection, type PermissionMatrix } from "@/lib/permissions";
import type { DbPointageJourJson } from "../../database/migrations/019_pointage_table.types";

export const POINTAGE_SAISIE_SECTION = "pointage.saisie";

/** Saisir un jour encore vide. */
export function canCreatePointageDay(
  matrix: PermissionMatrix,
  username?: string
): boolean {
  return canAccessSection(matrix, POINTAGE_SAISIE_SECTION, "write", username);
}

/** Modifier ou supprimer un jour déjà enregistré en base. */
export function canModifyRecordedPointageDay(
  matrix: PermissionMatrix,
  username?: string
): boolean {
  return canAccessSection(matrix, POINTAGE_SAISIE_SECTION, "validate1", username);
}

function jourSnapshot(jour: DbPointageJourJson): string {
  return JSON.stringify(jour);
}

/** Détecte une modification ou suppression d'un jour déjà persisté. */
export function pointagePayloadModifiesPersistedDays(
  persisted: DbPointageJourJson[],
  incoming: DbPointageJourJson[]
): boolean {
  const persistedByDate = new Map(persisted.map((j) => [j.date, j]));
  const incomingByDate = new Map(incoming.map((j) => [j.date, j]));

  for (const [date, before] of persistedByDate) {
    const after = incomingByDate.get(date);
    if (!after) return true;
    if (jourSnapshot(before) !== jourSnapshot(after)) return true;
  }
  return false;
}
