import { convertCurrency } from "@/lib/currency";
import {
  buildIrppDisplayLabel,
  IRPP_DEPENDENT_ABATEMENT,
  IRPP_MAX_DEPENDENTS,
} from "@/lib/irpp-bareme";
import { calculateMonthlyBaseFromPointage, calculatePayroll, type OvertimeInput } from "@/lib/payroll";
import { getSmigRowByGrade, SMIG_DAYS_REFERENCE, DEFAULT_SMIG_BAREME } from "@/lib/smig-bareme";
import type {
  AppSettings,
  Currency,
  Employee,
  JobPositionPayroll,
  PayrollResult,
  SmigBaremeRow,
} from "@/lib/types";
import { resolveWorkMonthMode } from "@/lib/work-month-mode";

export const DEFAULT_POINTAGE = {
  daysPresent: 26,
  daysSick: 0,
  daysAnnualLeave: 0,
  daysHoliday: 0,
  dependents: 0,
  otherDeductions: 0,
} as const;

/** Nombre de personnes à charge IRPP (famille déclarée). */
export function countChargeDependents(family: { aCharge: boolean }[]): number {
  return family.filter((m) => m.aCharge).length;
}

export type IrppFormulaDetail = {
  label: string;
  iprBeforeAbatement: number;
  iprAbatementPercent?: number;
  ipr: number;
  baseIpr?: number;
  bracketBreakdown?: NonNullable<PayrollResult["iprBracketBreakdown"]>;
};

export type DependentMergeStep = {
  personIndex: number;
  netGain: number;
  iprReduction: number;
  irppFormula: IrppFormulaDetail;
};

export type PayrollEmployeeMergeNotice = {
  posteDependents: number;
  employeeDependents: number;
  abatementPercentPoste: number;
  abatementPercentEmployee: number;
  currency: Currency;
  iprPoste: number;
  iprEmployee: number;
  netPoste: number;
  netEmployee: number;
  irppFormulaPoste: IrppFormulaDetail;
  irppFormulaEmployee: IrppFormulaDetail;
  dependentSteps: DependentMergeStep[];
};

export function toIrppFormulaDetail(result: PayrollResult): IrppFormulaDetail {
  return {
    label: buildIrppDisplayLabel(result.iprAppliedRates, result.iprAbatementPercent),
    iprBeforeAbatement: result.iprBeforeAbatement ?? result.ipr,
    iprAbatementPercent: result.iprAbatementPercent,
    ipr: result.ipr,
    baseIpr: result.baseIpr ?? result.taxableBase,
    bracketBreakdown: result.iprBracketBreakdown,
  };
}

function irppAbatementPercent(dependents: number): number {
  return Math.min(Math.max(0, dependents), IRPP_MAX_DEPENDENTS) * IRPP_DEPENDENT_ABATEMENT;
}

function payrollResultForDependents(
  payroll: JobPositionPayroll,
  dependents: number,
  settings: AppSettings
): PayrollResult {
  const convertAmount = (amount: number, from: Currency, to: Currency) =>
    convertCurrency(amount, from, to, settings.exchangeRate);
  const bareme = settings.smigBareme?.length ? settings.smigBareme : DEFAULT_SMIG_BAREME;
  return computePayrollLikeSimulator(
    { ...payroll, dependents },
    settings,
    convertAmount,
    bareme
  );
}

function buildDependentMergeSteps(
  payroll: JobPositionPayroll,
  fromDependents: number,
  toDependents: number,
  settings: AppSettings
): DependentMergeStep[] {
  const steps: DependentMergeStep[] = [];
  const step = toDependents > fromDependents ? 1 : -1;
  const start = fromDependents;
  const end = toDependents;

  for (let d = start; d !== end; d += step) {
    const prev = payrollResultForDependents(payroll, d, settings);
    const next = payrollResultForDependents(payroll, d + step, settings);
    steps.push({
      personIndex: step > 0 ? d + 1 : d,
      netGain: roundMoney(next.netSalary - prev.netSalary),
      iprReduction: roundMoney(prev.ipr - next.ipr),
      irppFormula: toIrppFormulaDetail(next),
    });
  }

  return steps;
}

/** Détail affiché quand les personnes à charge employé ≠ fiche poste. */
export function buildPayrollEmployeeMergeNotice(
  payroll: JobPositionPayroll,
  employee?: Pick<Employee, "family"> | null,
  settings?: AppSettings | null
): PayrollEmployeeMergeNotice | null {
  if (!employee || !settings) return null;
  const posteDependents = payroll.dependents ?? DEFAULT_POINTAGE.dependents;
  const employeeDependents = countChargeDependents(employee.family);
  if (posteDependents === employeeDependents) return null;

  const posteResult = payrollResultForDependents(payroll, posteDependents, settings);
  const employeeResult = payrollResultForDependents(payroll, employeeDependents, settings);
  const dependentSteps = buildDependentMergeSteps(
    payroll,
    posteDependents,
    employeeDependents,
    settings
  );

  return {
    posteDependents,
    employeeDependents,
    abatementPercentPoste: irppAbatementPercent(posteDependents),
    abatementPercentEmployee: irppAbatementPercent(employeeDependents),
    currency: payroll.currency,
    iprPoste: posteResult.ipr,
    iprEmployee: employeeResult.ipr,
    netPoste: posteResult.netSalary,
    netEmployee: employeeResult.netSalary,
    irppFormulaPoste: toIrppFormulaDetail(posteResult),
    irppFormulaEmployee: toIrppFormulaDetail(employeeResult),
    dependentSteps,
  };
}

/** Applique les personnes à charge de l'employé affecté sur la config paie du poste. */
export function mergePayrollWithEmployeeDependents(
  payroll: JobPositionPayroll,
  employee?: { family: { aCharge: boolean }[] } | null
): JobPositionPayroll {
  if (!employee) return payroll;
  return {
    ...payroll,
    dependents: countChargeDependents(employee.family),
  };
}

/** Jours prestés (P) : override dossier employé → paramètre entreprise. */
export function mergePayrollWithWorkMonthMode(
  payroll: JobPositionPayroll,
  settings?: Pick<AppSettings, "workMonthMode"> | null,
  employee?: Pick<Employee, "workMonthMode"> | null
): JobPositionPayroll {
  return {
    ...payroll,
    daysPresent: resolveWorkMonthMode(employee, settings),
  };
}

export type PayrollEmployeePreview = {
  payroll: JobPositionPayroll;
  mergeNotice: PayrollEmployeeMergeNotice | null;
};

/** Bulletin / affectation : personnes à charge de l'employé (jours prestés = fiche poste enregistrée). */
export function mergePayrollForEmployeePreview(
  payroll: JobPositionPayroll,
  employee?: Pick<Employee, "family" | "workMonthMode"> | null,
  settings?: AppSettings | null
): PayrollEmployeePreview {
  return {
    payroll: mergePayrollWithEmployeeDependents(payroll, employee),
    mergeNotice: buildPayrollEmployeeMergeNotice(payroll, employee, settings),
  };
}

export type PayrollSimulatorInit = {
  currency: Currency;
  smigGrade: number;
  smigCategory: string;
  /** Montants de référence en CDF (modifiables dans le simulateur) */
  dailyBaseCdf: number;
  transportDailyCdf: number;
  housingMonthlyCdf: number;
  daysPresent: number;
  daysSick: number;
  daysAnnualLeave: number;
  daysHoliday: number;
  dependents: number;
  unionMember: boolean;
  otherDeductions: number;
};

/** Transport journalier SMIG en CDF (ordre de grandeur légal, jamais < ~500 CDF/j). */
const TRANSPORT_DAILY_CDF_MAGNITUDE = 500;
/** Logement mensuel SMIG en CDF (ordre de grandeur, jamais < ~10 000 CDF/mois). */
const HOUSING_MONTHLY_CDF_MAGNITUDE = 10_000;

function toCdf(
  amount: number,
  currency: Currency,
  convertAmount: (amount: number, from: Currency, to: Currency) => number
): number {
  return currency === "CDF" ? amount : convertAmount(amount, "USD", "CDF");
}

/**
 * Normalise un montant vers CDF en détectant les valeurs CDF mal étiquetées USD
 * (ex. trans_j = 6014 avec devise USD — doit rester 6014 CDF, pas 6014×taux).
 */
export function amountToCanonicalCdf(
  amount: number,
  declaredCurrency: Currency,
  convertAmount: (amount: number, from: Currency, to: Currency) => number,
  magnitude: "transport_daily" | "housing_monthly"
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  const cdfFloor =
    magnitude === "transport_daily"
      ? TRANSPORT_DAILY_CDF_MAGNITUDE
      : HOUSING_MONTHLY_CDF_MAGNITUDE;

  if (amount >= cdfFloor) {
    return Math.round(amount);
  }

  if (declaredCurrency === "USD") {
    return Math.round(convertAmount(amount, "USD", "CDF"));
  }

  return Math.round(amount);
}

function inferTransportDailyCdf(
  payroll: JobPositionPayroll,
  row: SmigBaremeRow,
  convertAmount: (amount: number, from: Currency, to: Currency) => number
): number {
  if (payroll.transportDaily == null || payroll.transportDaily <= 0) {
    return row.transportDaily;
  }
  return amountToCanonicalCdf(
    payroll.transportDaily,
    payroll.currency,
    convertAmount,
    "transport_daily"
  );
}

function inferHousingMonthlyCdf(
  payroll: JobPositionPayroll,
  row: SmigBaremeRow,
  convertAmount: (amount: number, from: Currency, to: Currency) => number
): number {
  if (payroll.housingAllowance == null || payroll.housingAllowance <= 0) {
    return row.housingAllowance;
  }
  return amountToCanonicalCdf(
    payroll.housingAllowance,
    payroll.currency,
    convertAmount,
    "housing_monthly"
  );
}

function toPayrollCurrency(
  amountCdf: number,
  currency: Currency,
  convertAmount: (amount: number, from: Currency, to: Currency) => number
): number {
  return currency === "CDF" ? amountCdf : convertAmount(amountCdf, "CDF", "USD");
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function inferDailyBaseFromPayroll(
  payroll: JobPositionPayroll,
  row: SmigBaremeRow,
  convertAmount: (amount: number, from: Currency, to: Currency) => number
): number {
  if (payroll.dailyBaseSalary != null && payroll.dailyBaseSalary > 0) {
    return Math.round(toCdf(payroll.dailyBaseSalary, payroll.currency, convertAmount));
  }

  const daysPresent = payroll.daysPresent ?? DEFAULT_POINTAGE.daysPresent;
  const daysSick = payroll.daysSick ?? DEFAULT_POINTAGE.daysSick;
  const daysAnnualLeave = payroll.daysAnnualLeave ?? DEFAULT_POINTAGE.daysAnnualLeave;
  const daysHoliday = payroll.daysHoliday ?? DEFAULT_POINTAGE.daysHoliday;

  if (payroll.baseSalary > 0) {
    const monthlyCdf = toCdf(payroll.baseSalary, payroll.currency, convertAmount);
    const weight =
      daysPresent + (2 / 3) * daysSick + daysAnnualLeave + 2 * daysHoliday;

    if (weight > 0 && (daysSick > 0 || daysAnnualLeave > 0 || daysHoliday > 0)) {
      return Math.round(monthlyCdf / weight);
    }

    if (daysPresent > 0) {
      const dailyFromCurrent = monthlyCdf / daysPresent;
      const dailyFrom26 = monthlyCdf / SMIG_DAYS_REFERENCE;
      const rowDailyCdf = row.dailyBaseSalary;

      if (daysPresent !== SMIG_DAYS_REFERENCE) {
        const offRow =
          rowDailyCdf > 0 ? Math.abs(dailyFromCurrent - rowDailyCdf) / rowDailyCdf : 1;
        const off26 = rowDailyCdf > 0 ? Math.abs(dailyFrom26 - rowDailyCdf) / rowDailyCdf : 1;
        // base mensuelle souvent enregistrée sur 26 j — ne pas diviser par les jours du mois clôturé
        if (offRow > 0.08 && (off26 <= 0.08 || Math.abs(dailyFrom26 - dailyFromCurrent) > 0.01)) {
          return Math.round(dailyFrom26);
        }
      }
      return Math.round(dailyFromCurrent);
    }
  }

  return row.dailyBaseSalary;
}

export function initSimulatorFromPayroll(
  payroll: JobPositionPayroll | undefined,
  bareme: SmigBaremeRow[],
  convertAmount: (amount: number, from: Currency, to: Currency) => number = (a, from, to) =>
    from === to ? a : a
): PayrollSimulatorInit {
  const grade = payroll?.smigGrade ?? payroll?.category ?? 3;
  const row = getSmigRowByGrade(bareme, grade) ?? bareme[0];
  const dailyBaseCdf = payroll
    ? inferDailyBaseFromPayroll(payroll, row, convertAmount)
    : row.dailyBaseSalary;
  const transportDailyCdf = payroll
    ? inferTransportDailyCdf(payroll, row, convertAmount)
    : row.transportDaily;
  const housingMonthlyCdf = payroll
    ? inferHousingMonthlyCdf(payroll, row, convertAmount)
    : row.housingAllowance;

  return {
    currency: payroll?.currency ?? "CDF",
    smigGrade: grade,
    smigCategory: payroll?.smigCategory ?? row?.categoryLabel ?? "",
    dailyBaseCdf,
    transportDailyCdf,
    housingMonthlyCdf,
    daysPresent: payroll?.daysPresent ?? DEFAULT_POINTAGE.daysPresent,
    daysSick: payroll?.daysSick ?? DEFAULT_POINTAGE.daysSick,
    daysAnnualLeave: payroll?.daysAnnualLeave ?? DEFAULT_POINTAGE.daysAnnualLeave,
    daysHoliday: payroll?.daysHoliday ?? DEFAULT_POINTAGE.daysHoliday,
    dependents: payroll?.dependents ?? DEFAULT_POINTAGE.dependents,
    unionMember: payroll?.unionMember ?? false,
    otherDeductions: payroll?.otherDeductions ?? DEFAULT_POINTAGE.otherDeductions,
  };
}

export function smigAmountsFromRow(row: SmigBaremeRow) {
  return {
    dailyBaseCdf: row.dailyBaseSalary,
    transportDailyCdf: row.transportDaily,
    housingMonthlyCdf: row.housingAllowance,
  };
}

export function buildJobPositionPayrollFromSimulator(
  state: PayrollSimulatorInit & { payrollNotes?: string; allowances?: JobPositionPayroll["allowances"] },
  bareme: SmigBaremeRow[],
  convertAmount: (amount: number, from: Currency, to: Currency) => number
): JobPositionPayroll {
  const pointage = {
    dailyBaseSalary: state.dailyBaseCdf,
    transportPerDay: state.transportDailyCdf,
    daysPresent: state.daysPresent,
    daysSickMaternity: state.daysSick,
    daysAnnualLeave: state.daysAnnualLeave,
    daysHoliday: state.daysHoliday,
  };
  const breakdown = calculateMonthlyBaseFromPointage(pointage);
  const baseSalaryCdf = breakdown.baseSalaryMonthly;
  const baseSalary =
    state.currency === "CDF"
      ? baseSalaryCdf
      : convertAmount(baseSalaryCdf, "CDF", "USD");
  const dailyBaseSalary =
    state.currency === "CDF"
      ? state.dailyBaseCdf
      : convertAmount(state.dailyBaseCdf, "CDF", "USD");
  /** Logement et transport : toujours persistés en CDF (barème SMIG), quelle que soit la devise d'affichage. */
  const housingAllowance = roundMoney(state.housingMonthlyCdf);
  const transportDaily = roundMoney(state.transportDailyCdf);

  return {
    baseSalary: roundMoney(baseSalary),
    currency: state.currency,
    category: state.smigGrade,
    smigGrade: state.smigGrade,
    smigCategory: state.smigCategory,
    housingAllowance,
    transportDaily,
    dailyBaseSalary: roundMoney(dailyBaseSalary),
    unionMember: state.unionMember,
    allowances: state.allowances ?? [],
    payrollNotes: state.payrollNotes ?? "",
    daysPresent: state.daysPresent,
    daysSick: state.daysSick,
    daysAnnualLeave: state.daysAnnualLeave,
    daysHoliday: state.daysHoliday,
    dependents: state.dependents,
    otherDeductions: roundMoney(state.otherDeductions),
  };
}

/** Même calcul que `SalarySimulator` (pointage SMIG + indemnités). */
export function computePayrollLikeSimulator(
  payroll: JobPositionPayroll,
  params: AppSettings,
  convertAmount: (amount: number, from: Currency, to: Currency) => number,
  bareme: SmigBaremeRow[] = params.smigBareme ?? [],
  opts?: { overtime?: OvertimeInput }
): PayrollResult {
  const init = initSimulatorFromPayroll(payroll, bareme, convertAmount);
  const pointage = {
    dailyBaseSalary: init.dailyBaseCdf,
    transportPerDay: init.transportDailyCdf,
    daysPresent: init.daysPresent,
    daysSickMaternity: init.daysSick,
    daysAnnualLeave: init.daysAnnualLeave,
    daysHoliday: init.daysHoliday,
  };
  const pointageBreakdown = calculateMonthlyBaseFromPointage(pointage);
  const salary = {
    baseSalary: pointageBreakdown.baseSalaryMonthly,
    currency: init.currency,
    category: init.smigGrade,
    allowances: payroll.allowances ?? [],
  };
  return calculatePayroll(salary, params, init.otherDeductions, {
    pointage,
    housingAllowance: init.housingMonthlyCdf,
    dependents: init.dependents,
    unionMember: init.unionMember,
    overtime: opts?.overtime,
  });
}

/**
 * Reconstruit la config paie pour clôture / bulletin dossier.
 * Fiche poste : taux journalier, logement (forfait ou montant saisi), transport/j, barème, indemnités…
 * Pointage mensuel : jours P / M / C / F uniquement (base imposable et transport au prorata des jours).
 */
export function rebuildPayrollConfigFromPositionDaily(
  positionPayroll: JobPositionPayroll,
  pointage: {
    daysPresent: number;
    daysSick?: number;
    daysAnnualLeave?: number;
    daysHoliday?: number;
  },
  bareme: SmigBaremeRow[],
  convertAmount: (amount: number, from: Currency, to: Currency) => number
): JobPositionPayroll {
  const init = initSimulatorFromPayroll(positionPayroll, bareme, convertAmount);
  const daysPresent = pointage.daysPresent;
  return buildJobPositionPayrollFromSimulator(
    {
      ...init,
      daysPresent,
      daysSick: pointage.daysSick ?? 0,
      daysAnnualLeave: pointage.daysAnnualLeave ?? 0,
      daysHoliday: pointage.daysHoliday ?? 0,
      // Forfait / montant fiche poste — ne pas recalculer au prorata du pointage
      housingMonthlyCdf: init.housingMonthlyCdf,
      transportDailyCdf: init.transportDailyCdf,
      unionMember: positionPayroll.unionMember ?? false,
      otherDeductions: positionPayroll.otherDeductions ?? DEFAULT_POINTAGE.otherDeductions,
      allowances: positionPayroll.allowances ?? [],
      payrollNotes: positionPayroll.payrollNotes ?? "",
    },
    bareme,
    convertAmount
  );
}

/** Salaire journalier issu de la fiche poste (devise payroll). */
export function resolveDailyBaseFromPositionPayroll(
  positionPayroll: JobPositionPayroll,
  settings?: AppSettings,
  convertAmount: (amount: number, from: Currency, to: Currency) => number = (a, from, to) =>
    from === to ? a : a
): number {
  if (positionPayroll.dailyBaseSalary != null && positionPayroll.dailyBaseSalary > 0) {
    return positionPayroll.dailyBaseSalary;
  }
  const bareme = settings?.smigBareme?.length ? settings.smigBareme : DEFAULT_SMIG_BAREME;
  const init = initSimulatorFromPayroll(positionPayroll, bareme, convertAmount);
  return positionPayroll.currency === "CDF"
    ? init.dailyBaseCdf
    : convertAmount(init.dailyBaseCdf, "CDF", positionPayroll.currency);
}
/** Salaire journalier (devise payroll) pour affichage / PDF à partir d'une config paie. */
export function inferDailyBaseFromPayrollConfig(
  config: JobPositionPayroll,
  settings?: AppSettings,
  convertAmount: (amount: number, from: Currency, to: Currency) => number = (a, from, to) =>
    from === to ? a : a
): number {
  if (config.dailyBaseSalary != null && config.dailyBaseSalary > 0) {
    return config.dailyBaseSalary;
  }
  const bareme = settings?.smigBareme?.length ? settings.smigBareme : DEFAULT_SMIG_BAREME;
  const grade = config.smigGrade ?? config.category ?? 3;
  const row = getSmigRowByGrade(bareme, grade) ?? bareme[0];
  if (!row) {
    return config.dailyBaseSalary ?? config.baseSalary / (config.daysPresent || SMIG_DAYS_REFERENCE);
  }
  const dailyCdf = inferDailyBaseFromPayroll(config, row, convertAmount);
  return config.currency === "CDF"
    ? dailyCdf
    : convertAmount(dailyCdf, "CDF", config.currency);
}

/** Aligné sur « COÛT TOTAL EMPLOYEUR » affiché dans le bulletin simulé. */
export function computeEmployerTotalDisplayCost(result: PayrollResult): number {
  const totalRetenues = result.totalLegalDeductions ?? 0;
  const chargesEmployeurTotal = result.cnssEmployer + result.inpp + result.onem;
  return result.netSalary + totalRetenues + chargesEmployeurTotal;
}
