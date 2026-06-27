import {
  DEFAULT_IRPP_BRACKETS,
  DEFAULT_IRPP_MAX_RATE_OF_TAXABLE,
  DEFAULT_IRPP_MIN_MONTHLY_CDF,
} from "./irpp-bareme";
import type { PayrollParams, PayrollResult, SalaryPackage } from "./types";
import { applyInppToPayrollParams } from "./inpp-rate";
import {
  buildPayrollInputFromSalary,
  calculateIPRCdf,
  calculatePayrollRdc,
  convertPayrollRdcResult,
  fromCdf,
  toCdf,
  type PayrollCalcOptions,
  type PayrollRdcResult,
} from "./payroll-rdc";

export type {
  PayrollCalcOptions,
  OvertimeInput,
  PayrollRdcInput,
  PayrollRdcResult,
  PointageBreakdown,
  PointageInput,
} from "./payroll-rdc";
export {
  calculateIPRCdf,
  calculateInterimPrime,
  calculateMonthlyBaseFromPointage,
  calculateNightPay,
  calculateOvertimePay,
  calculatePayrollRdc,
  convertPayrollRdcResult,
  hourlyRateFromMonthlyBase,
  calculateIrppCdf,
  DEFAULT_IRPP_BRACKETS,
  formatIrppBracketRange,
  IPR_BRACKETS_CDF,
  monthlyCeilingFromBracket,
  normalizeIrppBrackets,
  monthlyLegalHours,
} from "./payroll-rdc";
export { convertCurrency, roundMoney, toCdf, fromCdf } from "./currency";

/** @deprecated Utiliser calculateIPRCdf — conservé pour compatibilité */
export function calculateIPR(
  taxableBase: number,
  currency: "USD" | "CDF",
  exchangeRate: number,
  dependents = 0,
  irppConfig?: Parameters<typeof calculateIPRCdf>[2]
): number {
  const baseCdf = toCdf(taxableBase, currency, exchangeRate);
  return fromCdf(
    calculateIPRCdf(baseCdf, dependents, irppConfig).iprDue,
    currency,
    exchangeRate
  );
}

function mapRdcToPayrollResult(
  r: PayrollRdcResult,
  allowancesTotal: number,
  otherDeductions: number
): PayrollResult {
  return {
    baseSalary: r.baseSalary,
    allowancesTotal,
    grossSalary: r.totalGains,
    brutContractuel: r.brutContractuel,
    totalRemunerationImposable: r.totalRemunerationImposable,
    totalGains: r.totalGains,
    totalLegalDeductions: r.totalLegalDeductions,
    housingAllowance: r.housingAllowance,
    transportAllowance: r.transportAllowance,
    overtimePay: r.overtimePay,
    nightPay: r.nightPay,
    costOfLivingPrime: r.costOfLivingPrime,
    interimPrime: r.interimPrime,
    unionContribution: r.unionContribution,
    baseCnss: r.baseCnss,
    cnssEmployee: r.cnssEmployee,
    taxableBase: r.baseIpr,
    baseIpr: r.baseIpr,
    iprBeforeAbatement: r.iprBeforeAbatement,
    iprAbatementPercent: r.iprAbatementPercent,
    iprAppliedRates: r.iprAppliedRates,
    iprBracketBreakdown: r.iprBracketBreakdown,
    ipr: r.ipr,
    otherDeductions,
    netSalary: r.netSalary,
    cnssEmployer: r.cnssEmployer,
    inpp: r.inpp,
    onem: r.onem,
    totalEmployerCost: r.totalEmployerCost,
    familyAllowanceEstimate: 0,
    currency: r.currency,
    hourlyRate: r.hourlyRate,
  };
}

/**
 * Calcul de paie agent — méthode RDC (support « Comment calculer mon salaire »).
 * NET = Total gains (imposable + logement + transport) − retenues légales.
 */
export function calculatePayroll(
  salary: SalaryPackage,
  params: PayrollParams,
  otherDeductions = 0,
  options?: PayrollCalcOptions
): PayrollResult {
  const payrollParams = applyInppToPayrollParams(params, {
    inppHeadcount: options?.inppHeadcount,
  });
  const input = buildPayrollInputFromSalary(salary, payrollParams, options);
  const otherDeductionsInCalcCurrency = toCdf(
    otherDeductions,
    salary.currency,
    params.exchangeRate
  );
  const rdcRaw = calculatePayrollRdc(
    { ...input, otherDeductions: otherDeductionsInCalcCurrency },
    payrollParams
  );
  const rdc =
    rdcRaw.currency === salary.currency
      ? rdcRaw
      : convertPayrollRdcResult(rdcRaw, salary.currency, payrollParams.exchangeRate);

  const allowancesTotal =
    rdc.housingAllowance +
    rdc.transportAllowance +
    salary.allowances
      .filter((a) => a.type !== "logement" && a.type !== "transport")
      .reduce((s, a) => s + a.amount, 0);

  return mapRdcToPayrollResult(rdc, allowancesTotal, otherDeductions);
}

export function calculateNoticePeriod(
  yearsOfService: number,
  opts?: { baseDays?: number; daysPerYear?: number }
): number {
  const base = opts?.baseDays ?? 14;
  const perYear = opts?.daysPerYear ?? 7;
  return base + yearsOfService * perYear;
}

export function calculateAnnualLeave(
  age: number,
  yearsOfService: number,
  monthsWorked: number
): { daysPerMonth: number; total: number; seniorityBonus: number } {
  const daysPerMonth = age < 18 ? 1.5 : 1;
  const base = Math.floor(monthsWorked) * daysPerMonth;
  const seniorityBonus = Math.floor(yearsOfService / 5);
  return {
    daysPerMonth,
    total: base + seniorityBonus,
    seniorityBonus,
  };
}

/** @deprecated Préférer calculateOvertimePay (payroll-rdc) avec taux 130/160/200 % */
export function calculateOvertimePayLegacy(
  monthlySalary: number,
  hours: number,
  majorationRate: number,
  legalWeeklyHours = 45
): number {
  const monthlyLegalHours = (legalWeeklyHours / 5) * 22;
  const hourlyRate = monthlySalary / monthlyLegalHours;
  return hourlyRate * hours * (1 + majorationRate);
}

export function validateSmig(
  grossSalary: number,
  currency: "USD" | "CDF",
  params: PayrollParams,
  /** Plancher SMIG mensuel dans la même devise que grossSalary */
  smigFloor?: number
): { valid: boolean; smig: number; message?: string } {
  const smig =
    smigFloor ?? (currency === "USD" ? params.smigUsd : params.smigCdf);
  if (grossSalary < smig) {
    const formatted =
      currency === "USD"
        ? smig.toLocaleString("fr-CD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : smig.toLocaleString("fr-CD", { maximumFractionDigits: 0 });
    return {
      valid: false,
      smig,
      message: `Salaire inférieur au SMIG (${formatted} ${currency}) — Art. 923, nul de plein droit (Art. 37)`,
    };
  }
  return { valid: true, smig };
}

export const DEFAULT_PAYROLL_PARAMS: PayrollParams = {
  smigUsd: 208,
  smigCdf: 559000,
  exchangeRate: 2850,
  cnssEmployeeRate: 0.05,
  cnssEmployerRate: 0.13,
  inppRate: 0.03,
  /** ONEM : 0,2 % de la base CNSS (support formation) */
  onemRate: 0.002,
  irppBrackets: DEFAULT_IRPP_BRACKETS.map((b) => ({ ...b })),
  irppMinMonthlyCdf: DEFAULT_IRPP_MIN_MONTHLY_CDF,
  irppMaxRateOfTaxable: DEFAULT_IRPP_MAX_RATE_OF_TAXABLE,
};
