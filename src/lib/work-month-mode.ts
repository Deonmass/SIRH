import type { AppSettings, Employee, WorkMonthMode } from "./types";

export const WORK_MONTH_MODE_OPTIONS: { value: WorkMonthMode; label: string; hint: string }[] = [
  {
    value: 26,
    label: "26 jours / mois",
    hint: "8 h × 26 — référence SMIG / paie mensuelle",
  },
  {
    value: 22,
    label: "22 jours / mois",
    hint: "5 j. × ~4 sem. — base calendaire ouvrée",
  },
];

export function normalizeWorkMonthMode(value: unknown, fallback: WorkMonthMode = 26): WorkMonthMode {
  if (value === 22 || value === 26) return value;
  return fallback;
}

/** Priorité : dossier employé → paramètres entreprise → 26. */
export function resolveWorkMonthMode(
  employee?: Pick<Employee, "workMonthMode"> | null,
  settings?: Pick<AppSettings, "workMonthMode"> | null
): WorkMonthMode {
  if (employee?.workMonthMode === 22 || employee?.workMonthMode === 26) {
    return employee.workMonthMode;
  }
  return normalizeWorkMonthMode(settings?.workMonthMode);
}
