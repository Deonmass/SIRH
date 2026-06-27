/**
 * Calcul de paie — méthodologie RDC
 * Inspiré du support « Comment calculer mon salaire » (brut contractuel, base CNSS, IPR, bulletin).
 */

import { fromCdf, toCdf } from "./currency";
import { calculateIPRCdf } from "./irpp-bareme";
import type { Currency, PayrollParams, SalaryPackage } from "./types";

export { fromCdf, toCdf } from "./currency";

export {
  calculateIPRCdf,
  calculateIrppCdf,
  DEFAULT_IRPP_BRACKETS,
  DEFAULT_IRPP_MAX_RATE_OF_TAXABLE,
  DEFAULT_IRPP_MIN_MONTHLY_CDF,
  formatIrppBracketRange,
  IPR_BRACKETS_CDF,
  irppBracketsToMonthly,
  IRPP_DEPENDENT_ABATEMENT,
  IRPP_MAX_DEPENDENTS,
  monthlyCeilingFromBracket,
  normalizeIrppBrackets,
} from "./irpp-bareme";

/** Prime de vie chère — tranches sur brut contractuel (CDF) */
export const COST_OF_LIVING_TIERS_CDF = [
  { upTo: 1_944_000, rate: 0.03 },
  { upTo: 21_600_000, rate: 0.15 },
] as const;

export type WorkMonthMode = 22 | 26;

/** Pointage mensuel — support « Comment calculer mon salaire » (tableau décisions) */
export interface PointageInput {
  /** Salaire de base journalier */
  dailyBaseSalary: number;
  /** Transport journalier (présence et fériés uniquement) */
  transportPerDay: number;
  /** Jours prestés (P) — base × jours + transport × jours */
  daysPresent: number;
  /** Maladie / maternité (M) — 2/3 du base journalier × jours, sans transport */
  daysSickMaternity: number;
  /** Congé annuel (CA) — base journalier × jours, sans transport */
  daysAnnualLeave: number;
  /** Jours fériés / dimanche (F) — base journalier × 2 × jours + transport × jours */
  daysHoliday: number;
}

export interface PointageBreakdown {
  dailyBaseSalary: number;
  transportPerDay: number;
  daysPresent: number;
  daysSickMaternity: number;
  daysAnnualLeave: number;
  daysHoliday: number;
  presentBasePay: number;
  presentTransport: number;
  sickMaternityPay: number;
  annualLeavePay: number;
  holidayBasePay: number;
  holidayTransport: number;
  /** Salaire de base mensuel imposable (somme des rubriques base) */
  baseSalaryMonthly: number;
  /** Indemnité transport mensuelle */
  transportAllowance: number;
  totalDaysAccounted: number;
}

/**
 * Dérive le salaire de base mensuel et le transport à partir du pointage.
 * @see Support formation — Tableau des décisions (P, M, CA, F)
 */
export function calculateMonthlyBaseFromPointage(input: PointageInput): PointageBreakdown {
  const d = input.dailyBaseSalary;
  const t = input.transportPerDay;

  const presentBasePay = d * input.daysPresent;
  const presentTransport = t * input.daysPresent;
  const sickMaternityPay = d * (2 / 3) * input.daysSickMaternity;
  const annualLeavePay = d * input.daysAnnualLeave;
  const holidayBasePay = d * 2 * input.daysHoliday;

  const baseSalaryMonthly =
    presentBasePay + sickMaternityPay + annualLeavePay + holidayBasePay;
  /** Transport mensuel pointage = transport journalier × jours prestés uniquement */
  const transportAllowance = presentTransport;
  const totalDaysAccounted =
    input.daysPresent +
    input.daysSickMaternity +
    input.daysAnnualLeave +
    input.daysHoliday;

  return {
    dailyBaseSalary: d,
    transportPerDay: t,
    daysPresent: input.daysPresent,
    daysSickMaternity: input.daysSickMaternity,
    daysAnnualLeave: input.daysAnnualLeave,
    daysHoliday: input.daysHoliday,
    presentBasePay,
    presentTransport,
    sickMaternityPay,
    annualLeavePay,
    holidayBasePay,
    holidayTransport: 0,
    baseSalaryMonthly,
    transportAllowance,
    totalDaysAccounted,
  };
}

export interface OvertimeInput {
  /** Heures sup. jours ouvrables : 2 premières h à 130 % */
  hours130?: number;
  /** Heures sup. jours ouvrables : au-delà de 2 h à 160 % */
  hours160?: number;
  /** Dimanche, fériés, samedi (régime 22 j) à 200 % */
  hours200?: number;
}

export interface PayrollRdcInput {
  baseSalaryMonthly: number;
  currency: Currency;
  exchangeRate: number;
  /** Jours prestés (défaut 26) */
  daysWorked?: number;
  workMonthMode?: WorkMonthMode;
  /** Indemnité logement (non imposable). Si absent et autoHousingRate > 0 → base × taux */
  housingAllowance?: number;
  autoHousingRate?: number;
  /** Transport mensuel ou calculé via transportPerDay × daysWorked */
  transportAllowance?: number;
  transportPerDay?: number;
  overtime?: OvertimeInput;
  nightHours?: number;
  /** Prime d'intérim (jours, min. 10) */
  interimDays?: number;
  /** Brut contractuel de l'occupant du poste (pour intérim) */
  occupantBrutContractuel?: number;
  applyCostOfLiving?: boolean;
  applyAstreinte?: boolean;
  /** Indemnités kilométriques, primes variables imposables, etc. */
  otherTaxableGains?: number;
  familyExtraLegal?: number;
  dependents?: number;
  unionMember?: boolean;
  otherDeductions?: number;
  loanDeductions?: number;
}

export interface PayrollRdcResult {
  baseSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  brutContractuel: number;
  overtimePay: number;
  nightPay: number;
  interimPrime: number;
  costOfLivingPrime: number;
  astreintePrime: number;
  familyExtraLegal: number;
  otherTaxableGains: number;
  totalRemunerationImposable: number;
  baseCnss: number;
  cnssEmployee: number;
  baseIpr: number;
  iprBeforeAbatement: number;
  iprAbatementPercent: number;
  iprAppliedRates: number[];
  iprBracketBreakdown: { rate: number; taxableAmount: number; taxAmount: number }[];
  ipr: number;
  unionContribution: number;
  totalLegalDeductions: number;
  totalGains: number;
  netSalary: number;
  cnssEmployer: number;
  inpp: number;
  onem: number;
  totalEmployerCost: number;
  hourlyRate: number;
  currency: Currency;
}

export interface PayrollCalcOptions {
  /** Pointage → salaire de base mensuel + transport calculés automatiquement */
  pointage?: PointageInput;
  /** Logement fixe (ex. base journalier × 26 × 30 %) — prioritaire sur autoHousingRate */
  housingAllowance?: number;
  dependents?: number;
  daysWorked?: number;
  workMonthMode?: WorkMonthMode;
  overtime?: OvertimeInput;
  nightHours?: number;
  /** Ex. 0.3 pour indemnité logement auto (30 % du base) */
  autoHousingRate?: number;
  transportPerDay?: number;
  interimDays?: number;
  occupantBrutContractuel?: number;
  applyCostOfLiving?: boolean;
  applyAstreinte?: boolean;
  otherTaxableGains?: number;
  familyExtraLegal?: number;
  unionMember?: boolean;
  kmIndemnity?: number;
  /** Effectif pour barème INPP (sinon forfait / dernier auto des paramètres) */
  inppHeadcount?: number;
}

export function monthlyLegalHours(mode: WorkMonthMode): number {
  return mode === 26 ? 8 * 26 : 8.8 * 22;
}

export function hourlyRateFromMonthlyBase(
  monthlyBase: number,
  mode: WorkMonthMode = 26
): number {
  return monthlyBase / monthlyLegalHours(mode);
}

export function calculateOvertimePay(
  monthlyBase: number,
  overtime: OvertimeInput,
  mode: WorkMonthMode = 26
): number {
  const hourly = hourlyRateFromMonthlyBase(monthlyBase, mode);
  const h130 = overtime.hours130 ?? 0;
  const h160 = overtime.hours160 ?? 0;
  const h200 = overtime.hours200 ?? 0;
  return (
    hourly * h130 * 1.3 +
    hourly * h160 * 1.6 +
    hourly * h200 * 2
  );
}

export function calculateNightPay(
  monthlyBase: number,
  nightHours: number,
  mode: WorkMonthMode = 26
): number {
  const hourly = hourlyRateFromMonthlyBase(monthlyBase, mode);
  return hourly * nightHours * 0.3;
}

export function calculateInterimPrime(
  occupantBrutContractuel: number,
  interimDays: number,
  mode: WorkMonthMode = 26
): number {
  if (interimDays < 10) return 0;
  const daily = occupantBrutContractuel / mode;
  return 0.25 * daily * interimDays;
}

export function calculateHousingAllowance(
  monthlyBase: number,
  rate = 0.3
): number {
  return monthlyBase * rate;
}

const PAYROLL_RDC_MONETARY_KEYS = [
  "baseSalary",
  "housingAllowance",
  "transportAllowance",
  "brutContractuel",
  "overtimePay",
  "nightPay",
  "interimPrime",
  "costOfLivingPrime",
  "astreintePrime",
  "familyExtraLegal",
  "otherTaxableGains",
  "totalRemunerationImposable",
  "baseCnss",
  "cnssEmployee",
  "baseIpr",
  "iprBeforeAbatement",
  "ipr",
  "unionContribution",
  "totalLegalDeductions",
  "totalGains",
  "netSalary",
  "cnssEmployer",
  "inpp",
  "onem",
  "totalEmployerCost",
  "hourlyRate",
] as const satisfies readonly (keyof PayrollRdcResult)[];

/** Convertit tous les montants d'un résultat paie vers une autre devise */
export function convertPayrollRdcResult(
  result: PayrollRdcResult,
  toCurrency: Currency,
  exchangeRate: number
): PayrollRdcResult {
  if (result.currency === toCurrency) return result;
  const c = (amount: number) => fromCdf(toCdf(amount, result.currency, exchangeRate), toCurrency, exchangeRate);
  const next = { ...result, currency: toCurrency } as PayrollRdcResult;
  for (const key of PAYROLL_RDC_MONETARY_KEYS) {
    next[key] = c(result[key]);
  }
  if (result.iprBracketBreakdown?.length) {
    next.iprBracketBreakdown = result.iprBracketBreakdown.map((b) => ({
      rate: b.rate,
      taxableAmount: c(b.taxableAmount),
      taxAmount: c(b.taxAmount),
    }));
  }
  return next;
}

export function costOfLivingRate(brutContractuelCdf: number): number {
  for (const tier of COST_OF_LIVING_TIERS_CDF) {
    if (brutContractuelCdf <= tier.upTo) return tier.rate;
  }
  return 0;
}

export function calculatePayrollRdc(
  input: PayrollRdcInput,
  params: PayrollParams
): PayrollRdcResult {
  const daysWorked = input.daysWorked ?? 26;
  const mode = input.workMonthMode ?? 26;
  const base = input.baseSalaryMonthly;

  let housing = input.housingAllowance ?? 0;
  if (housing === 0 && input.autoHousingRate && input.autoHousingRate > 0) {
    housing = base * input.autoHousingRate;
  }

  let transport = input.transportAllowance ?? 0;
  if (transport === 0 && input.transportPerDay && input.transportPerDay > 0) {
    transport = input.transportPerDay * daysWorked;
  }

  const brutContractuel = base + housing + transport;
  const hourly = hourlyRateFromMonthlyBase(base, mode);

  const overtimePay = input.overtime
    ? calculateOvertimePay(base, input.overtime, mode)
    : 0;
  const nightPay = input.nightHours
    ? calculateNightPay(base, input.nightHours, mode)
    : 0;

  const occupantBrut = input.occupantBrutContractuel ?? brutContractuel;
  const interimPrime =
    input.interimDays && input.interimDays > 0
      ? calculateInterimPrime(occupantBrut, input.interimDays, mode)
      : 0;

  const brutCdf = toCdf(brutContractuel, input.currency, input.exchangeRate);
  const costOfLivingPrime = input.applyCostOfLiving
    ? brutCdf * costOfLivingRate(brutCdf)
    : 0;
  const costOfLivingInCurrency = fromCdf(
    costOfLivingPrime,
    input.currency,
    input.exchangeRate
  );

  const astreintePrime = input.applyAstreinte ? brutContractuel * 0.125 : 0;
  const familyExtraLegal = input.familyExtraLegal ?? 0;
  const otherTaxable = input.otherTaxableGains ?? 0;

  const totalRemunerationImposable =
    base +
    overtimePay +
    nightPay +
    interimPrime +
    costOfLivingInCurrency +
    astreintePrime +
    familyExtraLegal +
    otherTaxable;

  const baseCnss = totalRemunerationImposable;
  const cnssEmployee = baseCnss * params.cnssEmployeeRate;
  const baseIpr = baseCnss - cnssEmployee;

  const baseIprCdf = toCdf(baseIpr, input.currency, input.exchangeRate);
  const {
    iprBeforeAbatement,
    iprAbatementPercent,
    iprDue,
    appliedBrackets,
  } = calculateIPRCdf(baseIprCdf, input.dependents ?? 0, {
    brackets: params.irppBrackets,
    minMonthlyCdf: params.irppMinMonthlyCdf,
    maxRateOfTaxable: params.irppMaxRateOfTaxable,
  });
  const ipr = fromCdf(iprDue, input.currency, input.exchangeRate);
  const iprBeforeAbatementCurrency = fromCdf(
    iprBeforeAbatement,
    input.currency,
    input.exchangeRate
  );
  const iprAppliedRates = appliedBrackets.map((b) => b.rate);
  const iprBracketBreakdown = appliedBrackets.map((b) => ({
    rate: b.rate,
    taxableAmount: fromCdf(b.taxableCdf, input.currency, input.exchangeRate),
    taxAmount: fromCdf(b.taxCdf, input.currency, input.exchangeRate),
  }));

  const unionContribution =
    input.unionMember === true ? base * 0.02 : 0;

  const otherDeductions = (input.otherDeductions ?? 0) + (input.loanDeductions ?? 0);
  const totalLegalDeductions =
    cnssEmployee + ipr + unionContribution + otherDeductions;

  const totalGains = totalRemunerationImposable + housing + transport;
  const netSalary = totalGains - totalLegalDeductions;

  const cnssEmployer = baseCnss * params.cnssEmployerRate;
  /** INPP : base = salaire de base mensuel (hors logement / transport) */
  const inpp = base * params.inppRate;
  const onem = baseCnss * params.onemRate;
  const totalEmployerCharges = cnssEmployer + inpp + onem;
  /** Coût employeur = charges patronales + retenues légales salarié (à reverser) */
  const totalEmployerCost = totalEmployerCharges + totalLegalDeductions;

  return {
    baseSalary: base,
    housingAllowance: housing,
    transportAllowance: transport,
    brutContractuel,
    overtimePay,
    nightPay,
    interimPrime,
    costOfLivingPrime: costOfLivingInCurrency,
    astreintePrime,
    familyExtraLegal,
    otherTaxableGains: otherTaxable,
    totalRemunerationImposable,
    baseCnss,
    cnssEmployee,
    baseIpr,
    iprBeforeAbatement: iprBeforeAbatementCurrency,
    iprAbatementPercent,
    iprAppliedRates,
    iprBracketBreakdown,
    ipr,
    unionContribution,
    totalLegalDeductions,
    totalGains,
    netSalary,
    cnssEmployer,
    inpp,
    onem,
    totalEmployerCost,
    hourlyRate: hourly,
    currency: input.currency,
  };
}

/** Construit l'entrée RDC à partir du package salaire + options */
export function buildPayrollInputFromSalary(
  salary: SalaryPackage,
  params: PayrollParams,
  options?: PayrollCalcOptions
): PayrollRdcInput {
  let housing = 0;
  let transport = 0;
  let otherTaxable = 0;

  for (const a of salary.allowances) {
    if (a.type === "logement") {
      housing += a.amount;
    } else if (a.type === "transport") {
      transport += a.amount;
    } else if (a.taxable || a.cotisable) {
      otherTaxable += a.amount;
    }
  }

  if (options?.kmIndemnity) {
    otherTaxable += options.kmIndemnity;
  }
  if (options?.otherTaxableGains) {
    otherTaxable += options.otherTaxableGains;
  }
  if (options?.familyExtraLegal) {
    otherTaxable += options.familyExtraLegal;
  }

  let baseSalaryMonthly = salary.baseSalary;
  let transportAllowance = transport > 0 ? transport : undefined;
  let transportPerDay = options?.transportPerDay;
  let daysWorked = options?.daysWorked ?? 26;

  /** Pointage / SMIG / barèmes légaux : montants toujours en CDF */
  const amountsInCdf = options?.pointage != null;

  if (options?.pointage) {
    const pointage = calculateMonthlyBaseFromPointage(options.pointage);
    baseSalaryMonthly = pointage.baseSalaryMonthly;
    transportAllowance = pointage.transportAllowance;
    transportPerDay = undefined;
    daysWorked = pointage.totalDaysAccounted || daysWorked;
  }

  return {
    baseSalaryMonthly,
    currency: amountsInCdf ? "CDF" : salary.currency,
    exchangeRate: params.exchangeRate,
    daysWorked,
    workMonthMode: options?.workMonthMode ?? 26,
    housingAllowance:
      options?.housingAllowance ??
      (housing > 0 ? housing : undefined),
    autoHousingRate:
      options?.housingAllowance || housing > 0
        ? undefined
        : options?.autoHousingRate,
    transportAllowance,
    transportPerDay,
    overtime: options?.overtime,
    nightHours: options?.nightHours,
    interimDays: options?.interimDays,
    occupantBrutContractuel: options?.occupantBrutContractuel,
    applyCostOfLiving: options?.applyCostOfLiving,
    applyAstreinte: options?.applyAstreinte,
    otherTaxableGains: otherTaxable,
    dependents: options?.dependents,
    unionMember: options?.unionMember,
    otherDeductions: 0,
  };
}
