import type { DbOvertimeMonthlyEntryJson } from "../../database/migrations/006_employes_mouvement.types";
import type { EmployeeOvertime, OvertimeMonthlyRecord, WorkMonthMode } from "@/lib/types";

export function overtimeRecordToEntry(record: OvertimeMonthlyRecord): DbOvertimeMonthlyEntryJson {
  const now = new Date().toISOString();
  return {
    id: record.id,
    mois_annee: record.moisAnnee,
    h_130: record.hours130,
    h_160: record.hours160,
    h_200: record.hours200,
    regime_j: record.workMonthMode ?? null,
    notes: record.notes?.trim() || null,
    cree_le: record.createdAt || now,
    modif_le: record.updatedAt || now,
  };
}

export function overtimeEntryToRecord(entry: DbOvertimeMonthlyEntryJson): OvertimeMonthlyRecord {
  return {
    id: entry.id,
    moisAnnee: entry.mois_annee,
    hours130: entry.h_130 ?? 0,
    hours160: entry.h_160 ?? 0,
    hours200: entry.h_200 ?? 0,
    workMonthMode: entry.regime_j ?? undefined,
    notes: entry.notes ?? undefined,
    createdAt: entry.cree_le,
    updatedAt: entry.modif_le,
  };
}

export function listOvertimeRecordsFromMouvementRaw(
  raw: unknown
): OvertimeMonthlyRecord[] {
  const parsed = parseOvertimeFromMouvementRaw(raw);
  return parsed
    .map(overtimeEntryToRecord)
    .sort((a, b) => b.moisAnnee.localeCompare(a.moisAnnee));
}

export function parseOvertimeFromMouvementRaw(raw: unknown): DbOvertimeMonthlyEntryJson[] {
  if (!raw) return [];
  if (typeof raw === "object" && raw !== null && "heures_sup_mensuelles" in raw) {
    const list = (raw as { heures_sup_mensuelles?: unknown }).heures_sup_mensuelles;
    return Array.isArray(list) ? (list as DbOvertimeMonthlyEntryJson[]) : [];
  }
  return [];
}

export function overtimeRecordsToMouvementEntries(
  records: OvertimeMonthlyRecord[]
): DbOvertimeMonthlyEntryJson[] {
  return records.map(overtimeRecordToEntry);
}

export function findOvertimeRecordForMonth(
  records: OvertimeMonthlyRecord[] | undefined,
  moisAnnee: string
): OvertimeMonthlyRecord | null {
  return records?.find((r) => r.moisAnnee === moisAnnee) ?? null;
}

export function overtimeRecordToEmployeeOvertime(
  record: Pick<OvertimeMonthlyRecord, "hours130" | "hours160" | "hours200">
): EmployeeOvertime {
  return {
    hours130: record.hours130,
    hours160: record.hours160,
    hours200: record.hours200,
  };
}

export function totalOvertimeHours(
  record: Pick<OvertimeMonthlyRecord, "hours130" | "hours160" | "hours200">
): number {
  return (record.hours130 ?? 0) + (record.hours160 ?? 0) + (record.hours200 ?? 0);
}

export function normalizeMoisAnnee(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed.slice(0, 7);
  return null;
}

export function currentMoisAnnee(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMoisAnneeLabel(moisAnnee: string): string {
  const [y, m] = moisAnnee.split("-");
  const month = Number(m);
  if (!y || !Number.isFinite(month) || month < 1 || month > 12) return moisAnnee;
  const label = new Date(Number(y), month - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function resolveWorkMonthModeForOvertime(
  record: Pick<OvertimeMonthlyRecord, "workMonthMode"> | null | undefined,
  fallback: WorkMonthMode
): WorkMonthMode {
  return record?.workMonthMode ?? fallback;
}
