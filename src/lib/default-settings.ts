import {
  DEFAULT_IRPP_BRACKETS,
  DEFAULT_IRPP_MAX_RATE_OF_TAXABLE,
  DEFAULT_IRPP_MIN_MONTHLY_CDF,
} from "./irpp-bareme";
import { DEFAULT_PAYROLL_PARAMS } from "./payroll";
import { DEFAULT_SMIG_BAREME, SMIG_BAREME_DATE } from "./smig-bareme";
import type { AppSettings, Grade, GradeLeaveDaysConfig, NamedOrgRef } from "./types";

export const DEFAULT_SUBCONTRACTORS: NamedOrgRef[] = [
  {
    id: "st-default-1",
    name: "Sous-traitant générique",
    code: "ST-GEN",
    active: true,
  },
];

export const DEFAULT_JOURNALIER_PROVIDERS: NamedOrgRef[] = [
  {
    id: "jr-default-1",
    name: "Journaliers — opérations",
    code: "JR-OPS",
    active: true,
  },
  {
    id: "jr-default-2",
    name: "Journaliers — chantier",
    code: "JR-CH",
    active: true,
  },
];

export const DEFAULT_DEPARTMENTS = [
  "Direction Générale",
  "Ressources Humaines",
  "Finance & Comptabilité",
  "Commercial",
  "Opérations",
  "IT & Digital",
  "Logistique",
  "Juridique",
];

export const DEFAULT_GRADES: Grade[] = [
  "Direction",
  "Cadre supérieur",
  "Cadre",
  "Agent maîtrise",
  "Agent",
  "Ouvrier",
];

/** Jours de congé annuel par grade (base avant bonus ancienneté art. 141) */
export const DEFAULT_GRADE_LEAVE_DAYS: GradeLeaveDaysConfig[] = [
  { grade: "Direction", annualDays: 30 },
  { grade: "Cadre supérieur", annualDays: 26 },
  { grade: "Cadre", annualDays: 22 },
  { grade: "Agent maîtrise", annualDays: 18 },
  { grade: "Agent", annualDays: 12 },
  { grade: "Ouvrier", annualDays: 12 },
];

export function syncGradeLeaveDays(
  grades: string[],
  current: GradeLeaveDaysConfig[],
  fallback: GradeLeaveDaysConfig[] = DEFAULT_GRADE_LEAVE_DAYS
): GradeLeaveDaysConfig[] {
  const map = new Map<string, number>();
  for (const row of fallback) map.set(row.grade, row.annualDays);
  for (const row of current) map.set(row.grade, row.annualDays);
  const legalDefault = fallback.find((r) => r.grade === "Agent")?.annualDays ?? 12;
  return grades.map((grade) => ({
    grade,
    annualDays: map.get(grade) ?? legalDefault,
  }));
}

export const DEFAULT_CATEGORIES = [
  { value: 1, label: "Catégorie 1", minSalary: 350 },
  { value: 2, label: "Catégorie 2", minSalary: 450 },
  { value: 3, label: "Catégorie 3", minSalary: 600 },
  { value: 4, label: "Catégorie 4", minSalary: 800 },
  { value: 5, label: "Catégorie 5", minSalary: 1100 },
  { value: 6, label: "Catégorie 6", minSalary: 1500 },
  { value: 7, label: "Catégorie 7", minSalary: 2000 },
];

export const DEFAULT_OVERTIME_RATES = [
  { id: "hs_jour", label: "Heures sup. jour", rate: 0.5 },
  { id: "hs_nuit", label: "Heures sup. nuit / férié", rate: 1 },
  { id: "hs_dimanche", label: "Dimanche", rate: 0.5 },
];

/** Article 1er — taux selon effectif ; assiette paie = salaire de base mensuel (hors indemnités) */
export const DEFAULT_INPP_TIERS = [
  { label: "Public — entreprises et établissements", rate: 0.04 },
  { label: "Privé — 1 à 50 salariés", rate: 0.035 },
  { label: "Privé — 51 à 300 salariés", rate: 0.03 },
  { label: "Privé — plus de 300 salariés", rate: 0.02 },
];

export function getDefaultSettings(): AppSettings {
  return {
    companyName: "Entreprise RDC SARL",
    companyRccm: "CD/KIN/RCCM/XX-XXXX",
    companyAddress: "Kinshasa, RDC",
    companyPhone: "",
    companyEmail: "",
    companyBrandColor: "#0f172a",
    companyBrandColorSecondary: "#0ea5e9",
    ...DEFAULT_PAYROLL_PARAMS,
    cnssPensionEmployerRate: 0.05,
    cnssPensionEmployeeRate: 0.05,
    cnssFamilyRate: 0.065,
    cnssRiskRate: 0.015,
    departments: [...DEFAULT_DEPARTMENTS],
    grades: [...DEFAULT_GRADES],
    gradeLeaveDays: DEFAULT_GRADE_LEAVE_DAYS.map((r) => ({ ...r })),
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    overtimeRates: DEFAULT_OVERTIME_RATES.map((o) => ({ ...o })),
    inppTiers: DEFAULT_INPP_TIERS.map((t) => ({ ...t })),
    inppSector: "prive",
    inppHeadcountForfait: null,
    irppBrackets: DEFAULT_IRPP_BRACKETS.map((b) => ({ ...b })),
    irppMinMonthlyCdf: DEFAULT_IRPP_MIN_MONTHLY_CDF,
    irppMaxRateOfTaxable: DEFAULT_IRPP_MAX_RATE_OF_TAXABLE,
    legalWeeklyHours: 45,
    legalDailyHours: 8,
    workMonthMode: 26,
    noticeBaseDays: 14,
    noticeDaysPerYear: 7,
    annualLeaveDaysPerMonth: 1,
    annualLeaveDaysPerMonthMinor: 1.5,
    congeCirconstanceMaxDays: 15,
    matriculePrefix: "RDC",
    hideSalariesFromDisplay: false,
    smigBareme: DEFAULT_SMIG_BAREME.map((r) => ({ ...r })),
    smigBaremeDate: SMIG_BAREME_DATE,
    subcontractors: DEFAULT_SUBCONTRACTORS.map((s) => ({ ...s })),
    journalierProviders: DEFAULT_JOURNALIER_PROVIDERS.map((j) => ({ ...j })),
    centresCouts: [],
  };
}
