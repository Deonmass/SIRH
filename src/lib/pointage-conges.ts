import type { DbPointageJourJson, DbPointageJourStatut } from "../../database/migrations/019_pointage_table.types";
import { isRdcHoliday } from "@/lib/conges-working-days";
import type { LeaveRecord, PointageRecord } from "@/lib/types";
import {
  buildMonthDays,
  computePointageSynthese,
  isFuturePointageDate,
  isWeekendDate,
  parseMoisAnnee,
  syntheseToApp,
} from "@/lib/pointage-utils";

/** Congés validés — impactent le pointage. */
export function isApprovedLeaveForPointage(status: LeaveRecord["status"]): boolean {
  return status === "approuve" || status === "termine";
}

export function isDateOnApprovedLeave(date: string, leaves: LeaveRecord[]): boolean {
  return leaves.some(
    (l) =>
      isApprovedLeaveForPointage(l.status) && date >= l.startDate && date <= l.endDate
  );
}

/** Jour ouvrable couvert par un congé approuvé → code congé. */
export function shouldDayBeConge(date: string, leaves: LeaveRecord[]): boolean {
  if (isWeekendDate(date) || isRdcHoliday(date)) return false;
  return isDateOnApprovedLeave(date, leaves);
}

const MANUAL_STATUTS = new Set<DbPointageJourStatut>([
  "maladie",
  "mission",
  "absent_justifie",
  "absent_non_justifie",
  "retard",
]);

function congeJourEntry(date: string, commentaire?: string | null): DbPointageJourJson {
  return {
    date,
    statut: "conge",
    heure_arrivee: null,
    heure_depart: null,
    minutes_retard: 0,
    heures_sup: 0,
    commentaire: commentaire?.trim() || "Congé approuvé",
  };
}

export function applyCongeToJour(
  date: string,
  existing: DbPointageJourJson | undefined,
  leaves: LeaveRecord[],
  asOf: Date = new Date()
): DbPointageJourJson | undefined {
  if (isFuturePointageDate(date, asOf)) {
    return undefined;
  }

  const wantConge = shouldDayBeConge(date, leaves);

  if (existing) {
    if (MANUAL_STATUTS.has(existing.statut)) return existing;
    if (wantConge) {
      return congeJourEntry(
        date,
        existing.commentaire?.includes("Congé approuvé")
          ? existing.commentaire
          : existing.commentaire || "Congé approuvé"
      );
    }
    if (existing.statut === "conge") return undefined;
    return existing;
  }

  if (wantConge) return congeJourEntry(date);
  return undefined;
}

export function mergeJoursForVisibleDaysWithConges(
  visibleDays: string[],
  existing: DbPointageJourJson[],
  leaves: LeaveRecord[],
  asOf: Date = new Date()
): DbPointageJourJson[] {
  const byDate = new Map(existing.map((j) => [j.date, j]));
  const merged: DbPointageJourJson[] = [];

  for (const date of visibleDays) {
    const jour = applyCongeToJour(date, byDate.get(date), leaves, asOf);
    if (jour) merged.push(jour);
  }

  return merged;
}

export function mergeJoursForMonthWithConges(
  moisAnnee: string,
  existing: DbPointageJourJson[],
  leaves: LeaveRecord[],
  asOf: Date = new Date()
): DbPointageJourJson[] {
  const { year, month } = parseMoisAnnee(moisAnnee);
  const monthDays = buildMonthDays(year, month);
  const byDate = new Map(existing.map((j) => [j.date, j]));
  const merged: DbPointageJourJson[] = [];

  for (const date of monthDays) {
    const jour = applyCongeToJour(date, byDate.get(date), leaves, asOf);
    if (jour) merged.push(jour);
  }

  return merged;
}

export function enrichPointageRecordWithConges(
  record: PointageRecord,
  moisAnnee: string,
  leaves: LeaveRecord[]
): PointageRecord {
  const jours = mergeJoursForMonthWithConges(moisAnnee, record.jours, leaves);
  return {
    ...record,
    jours,
    synthese: syntheseToApp(computePointageSynthese(jours)),
  };
}

export function pointageJoursDiffer(
  before: DbPointageJourJson[],
  after: DbPointageJourJson[]
): boolean {
  const mapBefore = new Map(before.map((j) => [j.date, JSON.stringify(j)]));
  const mapAfter = new Map(after.map((j) => [j.date, JSON.stringify(j)]));
  if (mapBefore.size !== mapAfter.size) return true;
  for (const [date, snapshot] of mapAfter) {
    if (mapBefore.get(date) !== snapshot) return true;
  }
  return false;
}
