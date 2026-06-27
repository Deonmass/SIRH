import { buildIrppDisplayLabel, buildIrppFormulaText } from "@/lib/irpp-bareme";
import { inferDailyBaseFromPayrollConfig } from "@/lib/payroll-simulator-config";
import type { AppSettings, JobPositionPayroll, PayrollResult } from "@/lib/types";

export type PayslipHtmlLine = {
  label: string;
  value: number;
  variant?: "gain" | "deduction" | "total" | "info" | "section";
  formula?: string;
  hideValue?: boolean;
};

function lineFmt(amount: number, currency: string): string {
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}\u00a0${currency}`;
}

/** Lignes détaillées alignées sur le simulateur / bulletin dossier. */
export function buildPayslipDetailLines(
  payroll: PayrollResult,
  config: JobPositionPayroll,
  settings: AppSettings
): PayslipHtmlLine[] {
  const p = config.daysPresent ?? 0;
  const m = config.daysSick ?? 0;
  const c = config.daysAnnualLeave ?? 0;
  const f = config.daysHoliday ?? 0;
  const daily = inferDailyBaseFromPayrollConfig(config, settings);
  const cur = payroll.currency;
  const dailyLabel = lineFmt(daily, cur);
  const presentPay = daily * p;
  const sickPay = daily * (2 / 3) * m;
  const leavePay = daily * c;
  const holidayPay = daily * 2 * f;
  const cnssRate = (settings.cnssEmployeeRate * 100).toFixed(0);
  const imposable = payroll.totalRemunerationImposable ?? payroll.baseSalary;
  const totalGains = payroll.totalGains ?? payroll.grossSalary;
  const iprBrut = payroll.iprBeforeAbatement ?? payroll.ipr;
  const baseIpr = payroll.baseIpr ?? payroll.taxableBase;
  const totalRetenues = payroll.totalLegalDeductions ?? payroll.cnssEmployee + payroll.ipr;

  const lines: PayslipHtmlLine[] = [
    { label: "Pointage du mois", value: 0, variant: "section", hideValue: true },
    {
      label: "Salaire de base journalier",
      value: daily,
      variant: "info",
    },
  ];

  if (p > 0) {
    lines.push({
      label: `Jours prestés (P) — ${p} j`,
      formula: `${dailyLabel} × ${p}`,
      value: presentPay,
      variant: "gain",
    });
  }
  if (m > 0) {
    lines.push({
      label: `Maladie / maternité (M) — ${m} j`,
      formula: `${dailyLabel} × ⅔ × ${m}`,
      value: sickPay,
      variant: "gain",
    });
  }
  if (c > 0) {
    lines.push({
      label: `Congé annuel (CA) — ${c} j`,
      formula: `${dailyLabel} × ${c}`,
      value: leavePay,
      variant: "gain",
    });
  }
  if (f > 0) {
    lines.push({
      label: `Jours fériés (F) — ${f} j`,
      formula: `${dailyLabel} × 2 × ${f}`,
      value: holidayPay,
      variant: "gain",
    });
  }

  lines.push(
    { label: "Rémunération imposable", value: 0, variant: "section", hideValue: true },
    { label: "Salaire de base", value: payroll.baseSalary, variant: "gain" },
    {
      label: "Primes & indemnités contractuelles",
      value: payroll.allowancesTotal ?? 0,
      variant: "gain",
    },
    { label: "Total rémunération imposable", value: imposable, variant: "total" },
    { label: "Retenues sur salaire", value: 0, variant: "section", hideValue: true },
    {
      label: `CNSS travailleur (${cnssRate} %)`,
      value: -payroll.cnssEmployee,
      variant: "deduction",
    },
    { label: "Base IRPP (après CNSS)", value: baseIpr, variant: "info" }
  );

  if (iprBrut !== payroll.ipr) {
    lines.push({
      label: "IRPP brut (barème progressif)",
      value: iprBrut,
      variant: "info",
    });
  }

  const irppLabel = buildIrppDisplayLabel(payroll.iprAppliedRates, payroll.iprAbatementPercent);
  const irppFormula = buildIrppFormulaText({
    bracketBreakdown: payroll.iprBracketBreakdown,
    iprBeforeAbatement: iprBrut,
    iprAbatementPercent: payroll.iprAbatementPercent,
    ipr: payroll.ipr,
    baseIpr,
    formatAmount: (amount) => lineFmt(amount, payroll.currency),
  });

  lines.push({
    label: irppLabel,
    formula: irppFormula,
    value: -payroll.ipr,
    variant: "deduction",
  });

  if (payroll.unionContribution) {
    lines.push({
      label: "Cotisation syndicale (2 %)",
      value: -payroll.unionContribution,
      variant: "deduction",
    });
  }

  lines.push(
    { label: "Total retenues légales", value: -totalRetenues, variant: "deduction" },
    { label: "Indemnités non imposables", value: 0, variant: "section", hideValue: true },
    {
      label: "Indemnité logement",
      value: payroll.housingAllowance ?? 0,
      variant: "gain",
    },
    {
      label: "Indemnité transport",
      value: payroll.transportAllowance ?? 0,
      variant: "gain",
    },
    { label: "Total gains", value: totalGains, variant: "total" },
    { label: "Net à payer (bulletin)", value: payroll.netSalary, variant: "total" }
  );

  return lines;
}

export { inferDailyBaseFromPayrollConfig as inferDailyBaseSalary };
