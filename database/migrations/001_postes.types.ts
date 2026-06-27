/**
 * Migration 001 — POSTES
 *
 * Colonnes en français court · sans FK · paie dans `poste_paie` (JSON).
 */

import type { Currency, EmployeeKind, Grade, ContractType, JobPositionStatus, JobPositionPayroll } from "@/lib/types";

/** Indemnité dans poste_paie.avantages[] */
export interface PostePaieAvantageJson {
  type: string;
  lib: string;
  montant: number;
  devise: Currency;
  impos: boolean;
  cotis: boolean;
  deb?: string;
  fin?: string;
}

/**
 * Structure JSON de la colonne `poste_paie`.
 * Clés courtes en français — mapper vers `JobPositionPayroll` côté app.
 */
export interface PostePaieJson {
  base: number;
  devise: Currency;
  categ: number;
  /** Salaire de base journalier (devise payroll) */
  base_j?: number;
  smig_grade?: number;
  smig_cat?: string;
  logem?: number;
  trans_j?: number;
  syndic?: boolean;
  notes?: string;
  j_pres?: number;
  j_mal?: number;
  j_ca?: number;
  j_fer?: number;
  charges?: number;
  autre_ret?: number;
  avantages?: PostePaieAvantageJson[];
}

/** Ligne table `postes` */
export interface DbPosteRow {
  id: number;
  code: string;
  titre: string;
  dept: string;
  grade: Grade;
  sup_code: string | null;
  statut: JobPositionStatus;
  type_contrat: ContractType;
  type_emp: EmployeeKind | null;
  centre_des_couts?: number | null;
  lieu_affectation: string | null;
  effectif: number;
  description: string;
  missions: string;
  exigences: string;
  competences_cles: string;
  kpi: string | null;
  poste_paie: PostePaieJson;
  cree_le: string;
  cree_par: string | null;
  modif_le: string;
  modif_par: string | null;
}

/** Correspondance colonnes ↔ JobPosition (app actuelle) */
export const POSTES_COLUMN_MAP = {
  code: "code",
  titre: "title",
  dept: "department",
  grade: "grade",
  sup_code: "reportsToId → code parent",
  statut: "status",
  type_contrat: "contractType",
  type_emp: "typeEmp",
  lieu_affectation: "location",
  effectif: "headcount",
  description: "description",
  missions: "missions",
  exigences: "requirements",
  competences_cles: "competencies",
  kpi: "kpi",
  poste_paie: "payroll (JSON)",
  cree_le: "createdAt",
  modif_le: "updatedAt",
} as const;

/** Correspondance clés JSON paie ↔ JobPositionPayroll */
export const POSTE_PAIE_KEY_MAP: Record<keyof PostePaieJson, keyof JobPositionPayroll | string> = {
  base: "baseSalary",
  devise: "currency",
  categ: "category",
  base_j: "dailyBaseSalary",
  smig_grade: "smigGrade",
  smig_cat: "smigCategory",
  logem: "housingAllowance",
  trans_j: "transportDaily",
  syndic: "unionMember",
  notes: "payrollNotes",
  j_pres: "daysPresent",
  j_mal: "daysSick",
  j_ca: "daysAnnualLeave",
  j_fer: "daysHoliday",
  charges: "dependents",
  autre_ret: "otherDeductions",
  avantages: "allowances",
};

export const MIGRATION_001_POSTES = {
  version: "001",
  name: "postes",
  tables: ["postes"] as const,
  foreignKeys: false,
  paieStorage: "poste_paie JSONB",
  status: "connected" as const,
};
