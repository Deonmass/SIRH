import { DEFAULT_INPP_TIERS, getDefaultSettings, syncGradeLeaveDays } from "./default-settings";
import { normalizeIrppBrackets } from "./irpp-bareme";
import { normalizeWorkMonthMode } from "./work-month-mode";
import { normalizeSmigRow } from "./smig-bareme";
import type { AppSettings, InppTierConfig } from "./types";

/** Ancien barème erroné (3 % / 3 % / 2 % / 1 %) avant alignement article 1er INPP */
const LEGACY_INPP_RATES = [0.03, 0.03, 0.02, 0.01];

function isLegacyInppTiers(tiers: InppTierConfig[]): boolean {
  if (tiers.length !== LEGACY_INPP_RATES.length) return false;
  const sorted = [...tiers].map((t) => t.rate).sort((a, b) => a - b);
  const legacy = [...LEGACY_INPP_RATES].sort((a, b) => a - b);
  return sorted.every((r, i) => Math.abs(r - legacy[i]) < 0.0001);
}

export function normalizeInppTiers(tiers?: InppTierConfig[]): InppTierConfig[] {
  const legal = DEFAULT_INPP_TIERS.map((t) => ({ ...t }));
  if (!tiers?.length) return legal;
  if (isLegacyInppTiers(tiers)) return legal;
  return tiers;
}

export function mergeSettings(partial?: Partial<AppSettings>): AppSettings {
  const defaults = getDefaultSettings();
  if (!partial) return defaults;
  const smigBareme = (partial.smigBareme?.length ? partial.smigBareme : defaults.smigBareme).map(
    (r) => normalizeSmigRow(r)
  );
  return {
    ...defaults,
    ...partial,
    departments: partial.departments?.length ? partial.departments : defaults.departments,
    grades: partial.grades?.length ? partial.grades : defaults.grades,
    gradeLeaveDays: syncGradeLeaveDays(
      partial.grades?.length ? partial.grades : defaults.grades,
      partial.gradeLeaveDays?.length ? partial.gradeLeaveDays : defaults.gradeLeaveDays,
      defaults.gradeLeaveDays
    ),
    categories: partial.categories?.length ? partial.categories : defaults.categories,
    overtimeRates: partial.overtimeRates?.length
      ? partial.overtimeRates
      : defaults.overtimeRates,
    inppTiers: normalizeInppTiers(
      partial.inppTiers?.length ? partial.inppTiers : defaults.inppTiers
    ),
    inppSector: partial.inppSector ?? defaults.inppSector,
    inppHeadcountForfait:
      partial.inppHeadcountForfait !== undefined
        ? partial.inppHeadcountForfait
        : defaults.inppHeadcountForfait,
    inppLastAutoHeadcount: partial.inppLastAutoHeadcount ?? defaults.inppLastAutoHeadcount,
    irppBrackets: normalizeIrppBrackets(
      partial.irppBrackets?.length ? partial.irppBrackets : defaults.irppBrackets
    ),
    irppMinMonthlyCdf: partial.irppMinMonthlyCdf ?? defaults.irppMinMonthlyCdf,
    irppMaxRateOfTaxable: partial.irppMaxRateOfTaxable ?? defaults.irppMaxRateOfTaxable,
    workMonthMode: normalizeWorkMonthMode(
      partial.workMonthMode,
      defaults.workMonthMode
    ),
    smigBareme,
    subcontractors: partial.subcontractors?.length
      ? partial.subcontractors
      : defaults.subcontractors,
    journalierProviders: partial.journalierProviders?.length
      ? partial.journalierProviders
      : defaults.journalierProviders,
    centresCouts:
      partial.centresCouts !== undefined ? partial.centresCouts : defaults.centresCouts,
  };
}

/** @deprecated Utiliser settings depuis la base — fallback constantes */
export { DEFAULT_DEPARTMENTS as DEPARTMENTS, DEFAULT_CATEGORIES as CATEGORIES, DEFAULT_GRADES as GRADES } from "./default-settings";
