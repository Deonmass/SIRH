import { effectiveLeaveRemaining } from "@/lib/conges-balance";
import { resolveWorkMonthMode } from "@/lib/work-month-mode";
import { resolveEmployeeHireDate, formatSeniorityLabel } from "@/lib/employee-seniority";
import {
  computePayrollLikeSimulator,
  initSimulatorFromPayroll,
  mergePayrollWithEmployeeDependents,
  resolveDailyBaseFromPositionPayroll,
} from "@/lib/payroll-simulator-config";
import { DEFAULT_SMIG_BAREME } from "@/lib/smig-bareme";
import type {
  AppSettings,
  Currency,
  Employee,
  Grade,
  JobPositionPayroll,
} from "@/lib/types";

export type RuptureType =
  | "licenciement"
  | "demission"
  | "fin_contrat"
  | "retraite"
  | "rupture_conventionnelle";

export type SoldeToutCompteDuLine = {
  id: string;
  label: string;
  days: number;
  dailyRate: number;
  formula: string;
  amount: number;
};

export type SoldeToutCompteRetenueLine = {
  id: string;
  label: string;
  rate: number;
  base: number;
  formula: string;
  amount: number;
};

export type SoldeToutCompteResult = {
  currency: Currency;
  terminationDate: string;
  ruptureType: RuptureType;
  hireDate?: string;
  seniorityLabel: string | null;
  yearsOfService: number;
  monthsInPartialYear: number;
  totalMonthsOfService: number;
  workDaysPerMonth: number;
  dailyBase: number;
  dailyHousing: number;
  dailyTransport: number;
  dailyTotal: number;
  daysPresent: number;
  noticeDays: number;
  noticeDaysCalculated: number;
  noticeRuleLabel: string;
  leaveRemainingDays: number;
  monthlyBase: number;
  monthlyGross: number;
  du: {
    lines: SoldeToutCompteDuLine[];
    total: number;
  };
  retenus: {
    lines: SoldeToutCompteRetenueLine[];
    total: number;
  };
  netStc: number;
  context: Record<string, string | number>;
};

/** Taux IRPP simplifié sur le total DU (décompte STC). */
export const STC_IRPP_RATE = 0.1;

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Affichage décimal STC (ex. 33.75). */
export function formatStcDays(days: number): string {
  return days.toFixed(2);
}

/** Parse saisie libre : vide → null, virgule ou point acceptés. */
export function parseStcDaysInput(text: string): number | null {
  const trimmed = text.trim().replace(/\s/g, "");
  if (trimmed === "") return null;
  const normalized = trimmed.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return roundMoney(n);
}

function parseDate(iso: string): Date {
  const normalized = iso.length === 10 ? `${iso}T12:00:00` : iso;
  return new Date(normalized);
}

export function computeServiceDuration(
  hireDate: string,
  asOf: Date
): { years: number; monthsInPartialYear: number; totalMonths: number } {
  const start = parseDate(hireDate);
  if (Number.isNaN(start.getTime()) || asOf < start) {
    return { years: 0, monthsInPartialYear: 0, totalMonths: 0 };
  }

  let years = asOf.getFullYear() - start.getFullYear();
  let months = asOf.getMonth() - start.getMonth();
  if (asOf.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalMonths = years * 12 + months;
  return {
    years: Math.max(0, years),
    monthsInPartialYear: Math.max(0, months),
    totalMonths: Math.max(0, totalMonths),
  };
}

function isCadreGrade(grade: string): boolean {
  const g = grade.toLowerCase();
  return g.includes("cadre") || g === "direction";
}

/** Préavis STC : Cadre 90 j. + 11 j./12 mois · Maîtrise 30 j. + 9 j./12 mois. */
export function calculateStcNoticeDays(
  grade: string,
  totalMonthsOfService: number
): { days: number; ruleLabel: string } {
  if (isCadreGrade(grade)) {
    const days = roundMoney(90 + (totalMonthsOfService * 11) / 12);
    return {
      days,
      ruleLabel: "Cadre : 90 j. + 11 j. / 12 mois d'ancienneté",
    };
  }
  const days = roundMoney(30 + (totalMonthsOfService * 9) / 12);
  return {
    days,
    ruleLabel: "Maîtrise : 30 j. + 9 j. / 12 mois d'ancienneté",
  };
}

function resolveDailyRates(
  employee: Employee,
  positionPayroll: JobPositionPayroll | null,
  settings: AppSettings,
  convertAmount: (amount: number, from: Currency, to: Currency) => number,
  workDaysPerMonth: number
): {
  currency: Currency;
  monthlyBase: number;
  monthlyGross: number;
  dailyBase: number;
  dailyHousing: number;
  dailyTransport: number;
} {
  if (positionPayroll) {
    const merged = mergePayrollWithEmployeeDependents(positionPayroll, employee);
    const payroll = computePayrollLikeSimulator(merged, settings, convertAmount);
    const monthlyBase = merged.baseSalary;
    const monthlyGross =
      payroll.baseSalary +
      (payroll.housingAllowance ?? 0) +
      (payroll.transportAllowance ?? 0) +
      (payroll.allowancesTotal ?? 0);
    const dailyBase =
      resolveDailyBaseFromPositionPayroll(merged, settings, convertAmount) ||
      monthlyBase / workDaysPerMonth;
    const dailyHousing = (payroll.housingAllowance ?? 0) / workDaysPerMonth;
    const bareme = settings.smigBareme?.length ? settings.smigBareme : DEFAULT_SMIG_BAREME;
    const transportDailyCdf = initSimulatorFromPayroll(merged, bareme, convertAmount)
      .transportDailyCdf;
    const dailyTransport =
      merged.currency === "CDF"
        ? transportDailyCdf
        : convertAmount(transportDailyCdf, "CDF", merged.currency);

    return {
      currency: merged.currency,
      monthlyBase,
      monthlyGross,
      dailyBase: roundMoney(dailyBase),
      dailyHousing: roundMoney(dailyHousing),
      dailyTransport: roundMoney(dailyTransport),
    };
  }

  const monthlyBase = employee.salary.baseSalary;
  const allowances = employee.salary.allowances.reduce((s, a) => s + a.amount, 0);
  const monthlyGross = monthlyBase + allowances;
  const dailyBase = monthlyBase / workDaysPerMonth;
  return {
    currency: employee.salary.currency,
    monthlyBase,
    monthlyGross,
    dailyBase: roundMoney(dailyBase),
    dailyHousing: 0,
    dailyTransport: 0,
  };
}

export function computeSoldeToutCompte(input: {
  employee: Employee;
  settings: AppSettings;
  positionPayroll?: JobPositionPayroll | null;
  terminationDate?: string;
  ruptureType?: RuptureType;
  convertAmount?: (amount: number, from: Currency, to: Currency) => number;
  daysPresent?: number;
  noticeDays?: number;
  cnssRate?: number;
  irppRate?: number;
}): SoldeToutCompteResult {
  const {
    employee,
    settings,
    positionPayroll = null,
    terminationDate = new Date().toISOString().slice(0, 10),
    ruptureType = "demission",
    convertAmount = (a, from, to) => (from === to ? a : a),
    daysPresent: daysPresentInput,
    noticeDays: noticeDaysInput,
    cnssRate = settings.cnssEmployeeRate ?? 0.05,
    irppRate = STC_IRPP_RATE,
  } = input;

  const asOf = parseDate(terminationDate);
  const hireDate = resolveEmployeeHireDate(employee);
  const seniorityLabel = hireDate ? formatSeniorityLabel(hireDate) : null;
  const service = hireDate
    ? computeServiceDuration(hireDate, asOf)
    : { years: 0, monthsInPartialYear: 0, totalMonths: 0 };

  const workDaysPerMonth = resolveWorkMonthMode(employee, settings);
  const { currency, monthlyBase, monthlyGross, dailyBase, dailyHousing, dailyTransport } =
    resolveDailyRates(employee, positionPayroll, settings, convertAmount, workDaysPerMonth);

  const dailyTotal = roundMoney(dailyBase + dailyHousing + dailyTransport);
  const leaveRemainingDays = effectiveLeaveRemaining(employee.leaveBalance);

  const noticeCalc = calculateStcNoticeDays(employee.grade, service.totalMonths);
  const noticeDaysCalculated = noticeCalc.days;
  const noticeDays = noticeDaysInput ?? noticeDaysCalculated;

  const defaultDaysPresent = Math.min(asOf.getDate(), workDaysPerMonth);
  const daysPresent = daysPresentInput ?? defaultDaysPresent;

  const fmtRate = (n: number) => `${n.toFixed(2)} ${currency}`;

  const joursPrestesAmount = roundMoney(dailyTotal * daysPresent);
  const preavisAmount = roundMoney(dailyBase * noticeDays);
  const congesAmount = roundMoney(dailyBase * leaveRemainingDays);

  const duLines: SoldeToutCompteDuLine[] = [
    {
      id: "jours",
      label: "Jours prestés",
      days: daysPresent,
      dailyRate: dailyTotal,
      formula: `(${fmtRate(dailyBase)} + ${fmtRate(dailyHousing)} + ${fmtRate(dailyTransport)}) × ${daysPresent} j.`,
      amount: joursPrestesAmount,
    },
    {
      id: "preavis",
      label: "Préavis",
      days: noticeDays,
      dailyRate: dailyBase,
      formula: `${fmtRate(dailyBase)} × ${formatStcDays(noticeDays)} j.`,
      amount: preavisAmount,
    },
    {
      id: "conges",
      label: "Congés",
      days: leaveRemainingDays,
      dailyRate: dailyBase,
      formula: `${fmtRate(dailyBase)} × ${leaveRemainingDays} j.`,
      amount: congesAmount,
    },
  ];

  const duTotal = roundMoney(joursPrestesAmount + preavisAmount + congesAmount);

  const cnssAmount = roundMoney(duTotal * cnssRate);
  const irppAmount = roundMoney(duTotal * irppRate);

  const retenusLines: SoldeToutCompteRetenueLine[] = [
    {
      id: "cnss",
      label: "CNSS",
      rate: cnssRate,
      base: duTotal,
      formula: `${fmtRate(duTotal)} × ${(cnssRate * 100).toFixed(0)} %`,
      amount: cnssAmount,
    },
    {
      id: "irpp",
      label: "IRPP",
      rate: irppRate,
      base: duTotal,
      formula: `${fmtRate(duTotal)} × ${(irppRate * 100).toFixed(0)} %`,
      amount: irppAmount,
    },
  ];

  const retenusTotal = roundMoney(cnssAmount + irppAmount);
  const netStc = roundMoney(duTotal - retenusTotal);

  return {
    currency,
    terminationDate,
    ruptureType,
    hireDate,
    seniorityLabel,
    yearsOfService: service.years,
    monthsInPartialYear: service.monthsInPartialYear,
    totalMonthsOfService: service.totalMonths,
    workDaysPerMonth,
    dailyBase,
    dailyHousing,
    dailyTransport,
    dailyTotal,
    daysPresent,
    noticeDays,
    noticeDaysCalculated,
    noticeRuleLabel: noticeCalc.ruleLabel,
    leaveRemainingDays,
    monthlyBase,
    monthlyGross,
    du: { lines: duLines, total: duTotal },
    retenus: { lines: retenusLines, total: retenusTotal },
    netStc,
    context: {
      grade: employee.grade,
      poste: employee.position,
      departement: employee.department,
      matricule: employee.matricule,
      contrat: employee.contractType,
      statut: employee.status,
    },
  };
}

export const RUPTURE_TYPE_LABELS: Record<RuptureType, string> = {
  licenciement: "Licenciement (employeur)",
  demission: "Démission (salarié)",
  fin_contrat: "Fin de CDD / mission",
  retraite: "Départ à la retraite",
  rupture_conventionnelle: "Rupture conventionnelle",
};

/** Types proposés dans le décompte STC. */
export const STC_RUPTURE_TYPES: RuptureType[] = ["demission", "licenciement", "retraite"];

export const SOLDE_TOUT_COMPTE_INFO_SECTIONS = [
  {
    title: "Objet du solde de tout compte (STC)",
    body:
      "Décompte de rupture : sommes dues (DU) au salarié moins retenues légales (CNSS, IRPP). Modèle aligné sur le décompte démission / retraite.",
  },
  {
    title: "Taux journaliers",
    body:
      "Salaire de base, logement et transport journaliers issus de la fiche de poste (ou du salaire dossier). Les jours prestés utilisent la somme des trois taux ; préavis et congés n'utilisent que le salaire de base journalier.",
  },
  {
    title: "Jours prestés",
    body:
      "Nombre de jours travaillés dans le mois de sortie (modifiable). Par défaut : jour du mois de la date de rupture, plafonné au mode de travail (22 ou 26 j.).",
  },
  {
    title: "Préavis",
    body:
      "Cadre / direction : 90 jours + 11 jours par 12 mois d'ancienneté. Maîtrise et autres grades : 30 jours + 9 jours par 12 mois. Le nombre de jours reste modifiable (préavis exécuté ou indemnisé).",
  },
  {
    title: "Congés",
    body:
      "Solde de congé annuel restant × salaire de base journalier (indemnité compensatrice).",
  },
  {
    title: "Retenues",
    body:
      "CNSS salarié : 5 % du total DU. IRPP : 10 % du total DU (taux simplifié du décompte STC).",
  },
  {
    title: "Net STC",
    body: "Total DU − total retenues = net à payer au titre du solde de tout compte.",
  },
] as const;
