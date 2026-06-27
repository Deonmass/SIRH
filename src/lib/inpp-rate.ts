import type { AppSettings, Employee, InppSector, InppTierConfig, PayrollParams } from "./types";

/** Effectif pris en compte pour le barème INPP (employés en paie). */
export const INPP_HEADCOUNT_STATUSES = ["actif", "essai", "conge", "preavis"] as const;

export function countInppHeadcount(employees: Employee[]): number {
  return employees.filter((e) =>
    INPP_HEADCOUNT_STATUSES.includes(e.status as (typeof INPP_HEADCOUNT_STATUSES)[number])
  ).length;
}

export function resolveInppHeadcount(
  settings: Pick<AppSettings, "inppHeadcountForfait" | "inppLastAutoHeadcount">,
  liveAutoCount?: number
): number {
  if (settings.inppHeadcountForfait != null && settings.inppHeadcountForfait > 0) {
    return Math.round(settings.inppHeadcountForfait);
  }
  if (liveAutoCount != null && liveAutoCount >= 0) return liveAutoCount;
  if (settings.inppLastAutoHeadcount != null && settings.inppLastAutoHeadcount >= 0) {
    return settings.inppLastAutoHeadcount;
  }
  return 1;
}

/** Article 1er — taux selon secteur et effectif (barème paramétrable). */
export function resolveInppRate(
  sector: InppSector,
  headcount: number,
  tiers: InppTierConfig[]
): number {
  if (sector === "public") {
    return tiers[0]?.rate ?? 0.04;
  }
  const n = Math.max(0, Math.round(headcount));
  if (n <= 50) return tiers[1]?.rate ?? 0.035;
  if (n <= 300) return tiers[2]?.rate ?? 0.03;
  return tiers[3]?.rate ?? 0.02;
}

export function resolveInppRateForSettings(
  settings: Pick<
    AppSettings,
    "inppSector" | "inppTiers" | "inppHeadcountForfait" | "inppLastAutoHeadcount"
  >,
  liveAutoCount?: number
): number {
  const headcount = resolveInppHeadcount(settings, liveAutoCount);
  const sector = settings.inppSector ?? "prive";
  return resolveInppRate(sector, headcount, settings.inppTiers);
}

/** Met à jour le taux INPP et l'effectif auto à partir de la liste employés. */
export function syncInppRateInSettings(
  settings: AppSettings,
  employees: Employee[]
): AppSettings {
  const autoCount = countInppHeadcount(employees);
  const rate = resolveInppRateForSettings(settings, autoCount);
  return {
    ...settings,
    inppLastAutoHeadcount: autoCount,
    inppRate: rate,
  };
}

function hasInppBarème(params: PayrollParams): params is AppSettings {
  const s = params as Partial<AppSettings>;
  return Array.isArray(s.inppTiers) && s.inppTiers.length > 0;
}

/** Applique le taux INPP dérivé (secteur + effectif) avant calcul de paie. */
export function applyInppToPayrollParams(
  params: PayrollParams,
  options?: { inppHeadcount?: number }
): PayrollParams {
  if (!hasInppBarème(params)) return params;
  const rate = resolveInppRateForSettings(params, options?.inppHeadcount);
  return { ...params, inppRate: rate };
}

export function formatInppRatePct(rate: number): string {
  return (rate * 100).toLocaleString("fr-CD", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(rate * 100) ? 0 : 1,
  });
}
