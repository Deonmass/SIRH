import type {
  DbPaiePayloadJson,
  DbPaiePayrollConfigJson,
  DbPaiePayrollResultJson,
  DbPaieExtraCostsJson,
  DbPaieRow,
} from "../../database/migrations/021_paie_table.types";
import type { Currency, EmployeeExtraCosts, JobPositionPayroll, PaieRecord, PayrollResult, AppSettings, Employee } from "@/lib/types";
import { totalExtraCosts } from "@/lib/extra-costs";
import { convertCurrency } from "@/lib/currency";
import { resolveEmployeeExtraCosts } from "@/lib/extra-costs-resolve";

export const EMPTY_PAIE_PAYLOAD: DbPaiePayloadJson = {
  mois_annee: "",
  statut: "cloture",
  source: "pointage",
  synthese: {
    jours_presents: 0,
    jours_maladie: 0,
    jours_conge: 0,
    jours_feries: 0,
    jours_mission: 0,
    jours_repos: 0,
    absences_justifiees: 0,
    absences_non_justifiees: 0,
    retards: 0,
    minutes_retard_total: 0,
    heures_sup_total: 0,
    jours_prestes_paie: 0,
    jours_maladie_paie: 0,
    jours_conge_paie: 0,
    jours_feries_paie: 0,
  },
  payroll_config: {
    baseSalary: 0,
    currency: "CDF",
    category: 3,
    daysPresent: 0,
    daysSick: 0,
    daysAnnualLeave: 0,
    daysHoliday: 0,
  },
  payroll_result: {
    baseSalary: 0,
    grossSalary: 0,
    netSalary: 0,
    totalEmployerCost: 0,
    cnssEmployee: 0,
    cnssEmployer: 0,
    ipr: 0,
    inpp: 0,
    onem: 0,
    overtimePay: 0,
    transportAllowance: 0,
    housingAllowance: 0,
    currency: "CDF",
  },
  heures_sup: 0,
  extra_costs_total: 0,
  total_a_payer: 0,
  cloture_le: new Date().toISOString(),
};

export function paieIdToApp(id: number): string {
  return String(id);
}

export function paieIdFromApp(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Identifiant paie invalide : ${id}`);
  return n;
}

export function parsePaiePayload(raw: string | null | undefined): DbPaiePayloadJson {
  if (!raw?.trim()) return { ...EMPTY_PAIE_PAYLOAD };
  try {
    const data = JSON.parse(raw) as Partial<DbPaiePayloadJson>;
    return {
      ...EMPTY_PAIE_PAYLOAD,
      ...data,
      synthese: { ...EMPTY_PAIE_PAYLOAD.synthese, ...(data.synthese ?? {}) },
      payroll_config: { ...EMPTY_PAIE_PAYLOAD.payroll_config, ...(data.payroll_config ?? {}) },
      payroll_result: { ...EMPTY_PAIE_PAYLOAD.payroll_result, ...(data.payroll_result ?? {}) },
    };
  } catch {
    return { ...EMPTY_PAIE_PAYLOAD };
  }
}

export function encodePaiePayload(payload: DbPaiePayloadJson): string {
  return JSON.stringify(payload);
}

export function moisAnneeFromPaieRow(row: Pick<DbPaieRow, "paie">): string {
  return parsePaiePayload(row.paie).mois_annee;
}

export function extraCostsToJson(c: EmployeeExtraCosts) {
  return {
    housing: c.housing,
    mileage: c.mileage,
    childrenEducation: c.childrenEducation,
    travel: c.travel,
    variables: c.variables,
    currency: c.currency,
  };
}

export function extraCostsFromJson(j: DbPaieExtraCostsJson): EmployeeExtraCosts {
  return {
    housing: j.housing,
    mileage: j.mileage,
    childrenEducation: j.childrenEducation,
    travel: j.travel,
    variables: j.variables,
    currency: j.currency,
  };
}

export function payrollConfigToJson(p: JobPositionPayroll): DbPaiePayrollConfigJson {
  return {
    baseSalary: p.baseSalary,
    currency: p.currency,
    category: p.category,
    smigGrade: p.smigGrade,
    smigCategory: p.smigCategory,
    housingAllowance: p.housingAllowance,
    transportDaily: p.transportDaily,
    daily_base_salary: p.dailyBaseSalary,
    unionMember: p.unionMember,
    allowances: p.allowances,
    payrollNotes: p.payrollNotes,
    daysPresent: p.daysPresent ?? 0,
    daysSick: p.daysSick ?? 0,
    daysAnnualLeave: p.daysAnnualLeave ?? 0,
    daysHoliday: p.daysHoliday ?? 0,
    dependents: p.dependents,
    otherDeductions: p.otherDeductions,
  };
}

export function payrollConfigFromJson(j: DbPaiePayrollConfigJson): JobPositionPayroll {
  return {
    baseSalary: j.baseSalary,
    currency: j.currency,
    category: j.category,
    smigGrade: j.smigGrade,
    smigCategory: j.smigCategory,
    housingAllowance: j.housingAllowance,
    transportDaily: j.transportDaily,
    dailyBaseSalary: j.daily_base_salary,
    unionMember: j.unionMember ?? false,
    allowances: (j.allowances ?? []) as JobPositionPayroll["allowances"],
    payrollNotes: j.payrollNotes ?? "",
    daysPresent: j.daysPresent,
    daysSick: j.daysSick,
    daysAnnualLeave: j.daysAnnualLeave,
    daysHoliday: j.daysHoliday,
    dependents: j.dependents,
    otherDeductions: j.otherDeductions,
  };
}

export function payrollResultToJson(r: PayrollResult): DbPaiePayrollResultJson {
  return {
    baseSalary: r.baseSalary,
    grossSalary: r.grossSalary,
    netSalary: r.netSalary,
    totalEmployerCost: r.totalEmployerCost,
    cnssEmployee: r.cnssEmployee,
    cnssEmployer: r.cnssEmployer,
    ipr: r.ipr,
    inpp: r.inpp,
    onem: r.onem,
    overtimePay: r.overtimePay ?? 0,
    transportAllowance: r.transportAllowance ?? 0,
    housingAllowance: r.housingAllowance ?? 0,
    currency: r.currency,
    totalLegalDeductions: r.totalLegalDeductions,
  };
}

export function rowToPaieRecord(row: DbPaieRow): PaieRecord {
  const payload = parsePaiePayload(row.paie);
  const extraCosts = payload.extra_costs ? extraCostsFromJson(payload.extra_costs) : undefined;
  const extraCostsTotal =
    payload.extra_costs_total ??
    (extraCosts ? totalExtraCosts(extraCosts) : 0);
  const totalAPayer =
    payload.total_a_payer ??
    (payload.payroll_result.netSalary + extraCostsTotal);
  return {
    id: paieIdToApp(row.id),
    matriculeEmploye: row.matricul_employe,
    moisAnnee: payload.mois_annee,
    statut: payload.statut,
    synthese: payload.synthese,
    payrollConfig: payrollConfigFromJson(payload.payroll_config),
    payrollResult: payload.payroll_result as PaieRecord["payrollResult"],
    heuresSup: payload.heures_sup,
    extraCosts,
    extraCostsTotal,
    totalAPayer,
    pointageId: payload.pointage_id ? String(payload.pointage_id) : undefined,
    clotureLe: payload.cloture_le,
    cloturePar: payload.cloture_par ?? undefined,
    commentaire: payload.commentaire ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? undefined,
  };
}

/** Net bulletin + coûts extra (montant à payer). */
export function resolvePaieNetWithExtras(
  rec: Pick<PaieRecord, "totalAPayer" | "payrollResult" | "extraCostsTotal">
): number {
  return rec.totalAPayer ?? rec.payrollResult.netSalary + (rec.extraCostsTotal ?? 0);
}

export function moisAnneeLabelFr(moisAnnee: string): string {
  const [y, m] = moisAnnee.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function formatPaieAmount(amount: number, currency: Currency): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} ${currency}`;
}

/** Convertit un snapshot coûts extra vers la devise du bulletin. */
export function convertExtraCostsCurrency(
  costs: EmployeeExtraCosts,
  targetCurrency: Currency,
  exchangeRate: number
): EmployeeExtraCosts {
  const convert = (amount: number) =>
    convertCurrency(amount, costs.currency, targetCurrency, exchangeRate);
  return {
    housing: convert(costs.housing),
    mileage: convert(costs.mileage),
    childrenEducation: convert(costs.childrenEducation),
    travel: convert(costs.travel),
    variables: convert(costs.variables),
    currency: targetCurrency,
  };
}

/** Coûts extra affichés : snapshot clôture ou dossier employé (bulletins antérieurs). */
export function resolvePaieRecordExtraCosts(
  rec: Pick<PaieRecord, "extraCosts" | "extraCostsTotal" | "payrollResult">,
  employee: Employee,
  settings: AppSettings
): { costs: EmployeeExtraCosts; total: number; fromSnapshot: boolean } {
  const currency = rec.payrollResult.currency;
  if (rec.extraCosts) {
    return {
      costs: rec.extraCosts,
      total: rec.extraCostsTotal ?? totalExtraCosts(rec.extraCosts),
      fromSnapshot: true,
    };
  }
  const raw = resolveEmployeeExtraCosts(employee);
  const costs = convertExtraCostsCurrency(raw, currency, settings.exchangeRate);
  return {
    costs,
    total: totalExtraCosts(costs),
    fromSnapshot: false,
  };
}
