import type { DbPointageSyntheseJson } from "./019_pointage_table.types";

/** Snapshot sérialisé JobPositionPayroll + résultat calculatePayroll */
export interface DbPaiePayrollConfigJson {
  baseSalary: number;
  currency: "USD" | "CDF";
  category: number;
  smigGrade?: number;
  smigCategory?: string;
  housingAllowance?: number;
  transportDaily?: number;
  /** Salaire journalier figé à la clôture (devise payroll) */
  daily_base_salary?: number;
  unionMember?: boolean;
  allowances?: { label: string; amount: number }[];
  payrollNotes?: string;
  daysPresent: number;
  daysSick: number;
  daysAnnualLeave: number;
  daysHoliday: number;
  dependents?: number;
  otherDeductions?: number;
}

export interface DbPaiePayrollResultJson {
  baseSalary: number;
  grossSalary: number;
  netSalary: number;
  totalEmployerCost: number;
  cnssEmployee: number;
  cnssEmployer: number;
  ipr: number;
  inpp: number;
  onem: number;
  overtimePay: number;
  transportAllowance: number;
  housingAllowance: number;
  currency: "USD" | "CDF";
  totalLegalDeductions?: number;
}

/** Coûts extra employeur (hors bulletin) — snapshot à la clôture */
export interface DbPaieExtraCostsJson {
  housing: number;
  mileage: number;
  childrenEducation: number;
  travel: number;
  variables: number;
  currency: "USD" | "CDF";
}

/** Contenu JSON de la colonne paie — seule source des données métier */
export interface DbPaiePayloadJson {
  mois_annee: string;
  statut: "cloture";
  source: "pointage";
  pointage_id?: number | null;
  synthese: DbPointageSyntheseJson;
  payroll_config: DbPaiePayrollConfigJson;
  payroll_result: DbPaiePayrollResultJson;
  heures_sup: number;
  /** Coûts extra mensuels (indemnités hors bulletin) */
  extra_costs?: DbPaieExtraCostsJson;
  /** Somme des coûts extra (même devise que payroll_result) */
  extra_costs_total?: number;
  /** Net à payer bulletin + coûts extra */
  total_a_payer?: number;
  cloture_le: string;
  cloture_par?: string | null;
  commentaire?: string | null;
}

/** Ligne SQL — colonnes audit uniquement + matricule + blob JSON paie */
export interface DbPaieRow {
  id: number;
  matricul_employe: string;
  paie: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}
