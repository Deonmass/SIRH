import { getDefaultSettings } from "./default-settings";
import type { AppSettings } from "./types";

/** Couleurs par défaut — alignées sur le thème rapports PDF. */
export const DEFAULT_COMPANY_BRAND_PRIMARY = "#0f172a";
export const DEFAULT_COMPANY_BRAND_SECONDARY = "#0ea5e9";

const ENTREPRISE_PARAM_KEYS = [
  "companyName",
  "companyRccm",
  "companyAddress",
  "companyPhone",
  "companyEmail",
  "companyLogoUrl",
  "companyBrandColor",
  "companyBrandColorSecondary",
  "matriculePrefix",
  "exchangeRate",
  "hideSalariesFromDisplay",
  "inppSector",
  "inppHeadcountForfait",
] as const satisfies readonly (keyof AppSettings)[];

/** Identifiants des sections Configuration (modals). */
export type ConfigurationSectionId =
  | "entreprise"
  | "effectifs"
  | "cnss"
  | "transport"
  | "departements"
  | "centres_couts"
  | "grades"
  | "categories"
  | "conges"
  | "autres";

export const CONFIGURATION_SECTIONS: {
  id: ConfigurationSectionId;
  titreConfig: string;
}[] = [
  { id: "entreprise", titreConfig: "Entreprise" },
  { id: "effectifs", titreConfig: "Externes & journaliers" },
  { id: "transport", titreConfig: "Barème SMIG / transport" },
  { id: "cnss", titreConfig: "CNSS / INPP / ONEM / IRPP" },
  { id: "departements", titreConfig: "Départements" },
  { id: "centres_couts", titreConfig: "Centres de coûts" },
  { id: "grades", titreConfig: "Grades" },
  { id: "categories", titreConfig: "Catégories" },
  { id: "conges", titreConfig: "Congés & préavis" },
  { id: "autres", titreConfig: "Heures sup." },
];

const TITRE_BY_ID = new Map(
  CONFIGURATION_SECTIONS.map((s) => [s.id, s.titreConfig] as const)
);
const ID_BY_TITRE = new Map(
  CONFIGURATION_SECTIONS.map((s) => [s.titreConfig, s.id] as const)
);

export function configurationTitreForSection(id: ConfigurationSectionId): string {
  return TITRE_BY_ID.get(id) ?? id;
}

export function configurationSectionIdFromTitre(
  titre: string
): ConfigurationSectionId | null {
  return ID_BY_TITRE.get(titre) ?? null;
}

function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    out[key] = obj[key];
  }
  return out;
}

/**
 * Payload JSON `configuration.params` pour la section Entreprise.
 * Inclut toujours `companyLogoUrl`, `companyBrandColor` et `companyBrandColorSecondary`.
 */
export function normalizeEntrepriseSectionParams(
  source: Partial<AppSettings>
): Record<string, unknown> {
  const merged = { ...getDefaultSettings(), ...source } as AppSettings;
  const picked = pick(merged, ENTREPRISE_PARAM_KEYS);

  const logo = source.companyLogoUrl ?? picked.companyLogoUrl;
  const logoUrl =
    typeof logo === "string" && logo.trim() ? logo.trim() : null;

  return {
    ...picked,
    companyLogoUrl: logoUrl,
    companyBrandColor:
      (source.companyBrandColor ?? picked.companyBrandColor)?.trim() ||
      DEFAULT_COMPANY_BRAND_PRIMARY,
    companyBrandColorSecondary:
      (source.companyBrandColorSecondary ?? picked.companyBrandColorSecondary)?.trim() ||
      DEFAULT_COMPANY_BRAND_SECONDARY,
  };
}

/** Extrait les champs AppSettings propres à une section (JSON `params`). */
export function extractConfigurationSectionParams(
  sectionId: ConfigurationSectionId,
  settings: AppSettings
): Partial<AppSettings> {
  switch (sectionId) {
    case "entreprise":
      return normalizeEntrepriseSectionParams(settings) as Partial<AppSettings>;
    case "effectifs":
      return pick(settings, ["subcontractors", "journalierProviders"] as const);
    case "transport":
      return pick(settings, ["smigBareme", "smigBaremeDate"] as const);
    case "cnss":
      return pick(settings, [
        "cnssEmployeeRate",
        "cnssEmployerRate",
        "inppRate",
        "onemRate",
        "cnssPensionEmployerRate",
        "cnssPensionEmployeeRate",
        "cnssFamilyRate",
        "cnssRiskRate",
        "inppTiers",
        "irppBrackets",
        "irppMinMonthlyCdf",
        "irppMaxRateOfTaxable",
      ] as const);
    case "departements":
      return pick(settings, ["departments"] as const);
    case "centres_couts":
      return pick(settings, ["centresCouts"] as const);
    case "grades":
      return pick(settings, ["grades"] as const);
    case "categories":
      return pick(settings, ["categories"] as const);
    case "conges":
      return pick(settings, [
        "legalWeeklyHours",
        "legalDailyHours",
        "workMonthMode",
        "noticeBaseDays",
        "noticeDaysPerYear",
        "annualLeaveDaysPerMonth",
        "annualLeaveDaysPerMonthMinor",
        "congeCirconstanceMaxDays",
        "gradeLeaveDays",
      ] as const);
    case "autres":
      return pick(settings, ["overtimeRates"] as const);
    default:
      return {};
  }
}

/** Fusionne les lignes `configuration` en un patch AppSettings. */
export function mergeConfigurationParamsFromRows(
  rows: { titre_config: string; params: Record<string, unknown> | null }[]
): Partial<AppSettings> {
  const merged: Record<string, unknown> = {};
  for (const row of rows) {
    if (!row.params || typeof row.params !== "object" || Array.isArray(row.params)) continue;
    for (const [key, value] of Object.entries(row.params)) {
      if (key.startsWith("_")) continue;
      merged[key] = value;
    }
  }
  const patch = merged as Partial<AppSettings>;
  if (patch.companyLogoUrl === null) {
    patch.companyLogoUrl = undefined;
  }
  return patch;
}
