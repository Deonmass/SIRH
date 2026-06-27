import { totalExtraCosts as sumExtraCosts } from "@/lib/extra-costs";
import {
  currentPayPeriod,
  formatPayPeriod,
  getPayableEmployees,
} from "@/lib/payslip-engine";
import { calculatePayroll } from "@/lib/payroll";
import { resolveWorkMonthMode } from "@/lib/work-month-mode";
import { jobPositionPayrollOptions, jobPositionToSalaryPackage } from "@/lib/postes";
import type { AppSettings, Currency, Database, Employee, JobPosition, PaieMasseBreakdown } from "@/lib/types";

function computeForEmployee(
  employee: Employee,
  position: JobPosition | undefined,
  settings: AppSettings
) {
  if (position?.payroll) {
    const salary = jobPositionToSalaryPackage(position.payroll);
    const options = jobPositionPayrollOptions(
      position.payroll,
      settings.smigBareme ?? []
    );
    return calculatePayroll(
      salary,
      settings,
      position.payroll.otherDeductions ?? 0,
      {
        ...options,
        dependents:
          position.payroll.dependents ??
          employee.family.filter((m) => m.aCharge).length,
        overtime: employee.overtime,
        workMonthMode: resolveWorkMonthMode(employee, settings),
      }
    );
  }
  return calculatePayroll(employee.salary, settings, 0, {
    dependents: employee.family.filter((m) => m.aCharge).length,
    overtime: employee.overtime,
    workMonthMode: resolveWorkMonthMode(employee, settings),
  });
}

export function aggregatePaieMasseFromLines(
  lines: PaieMasseEmployeeLine[],
  period: string,
  currency: Currency
): PaieMasseBreakdown {
  const deptMap = new Map<string, { count: number; net: number; employerCost: number }>();

  for (const line of lines) {
    const dept = deptMap.get(line.department) ?? { count: 0, net: 0, employerCost: 0 };
    dept.count += 1;
    dept.net += line.decaissement;
    dept.employerCost += line.employerCost;
    deptMap.set(line.department, dept);
  }

  const sum = (pick: (l: PaieMasseEmployeeLine) => number) =>
    Math.round(lines.reduce((s, l) => s + pick(l), 0));

  return {
    period,
    periodLabel: formatPayPeriod(period),
    isCurrentMonth: period === currentPayPeriod(),
    employeeCount: lines.length,
    totalGross: sum((l) => l.gross),
    totalNet: sum((l) => l.net),
    totalCnssEmployee: sum((l) => l.cnssEmployee),
    totalCnssEmployer: sum((l) => l.cnssEmployer),
    totalIpr: sum((l) => l.ipr),
    totalOnem: sum((l) => l.onem),
    totalInpp: sum((l) => l.inpp),
    totalEmployerCost: sum((l) => l.employerCost),
    totalExtraCosts: sum((l) => l.extraCosts),
    currency,
    byDepartment: [...deptMap.entries()]
      .map(([department, v]) => ({
        department,
        count: v.count,
        net: Math.round(v.net),
        employerCost: Math.round(v.employerCost),
      }))
      .sort((a, b) => b.net - a.net),
  };
}

export function buildPaieMasse(
  db: Database,
  settings: AppSettings,
  period?: string
): PaieMasseBreakdown {
  const payPeriod = period ?? currentPayPeriod();
  const lines = buildPaieMasseEmployeeLines(db, settings, payPeriod);
  const currency = resolveMasseCurrency(db, lines, payPeriod);
  if (!lines.length) {
    return emptyPaieMasseBreakdown(payPeriod, currency);
  }
  return aggregatePaieMasseFromLines(lines, payPeriod, currency);
}

export function emptyPaieMasseBreakdown(period: string, currency: Currency = "USD"): PaieMasseBreakdown {
  return {
    period,
    periodLabel: formatPayPeriod(period),
    isCurrentMonth: period === currentPayPeriod(),
    employeeCount: 0,
    totalGross: 0,
    totalNet: 0,
    totalCnssEmployee: 0,
    totalCnssEmployer: 0,
    totalIpr: 0,
    totalOnem: 0,
    totalInpp: 0,
    totalEmployerCost: 0,
    totalExtraCosts: 0,
    currency,
    byDepartment: [],
  };
}

export function resolveMasseCurrency(
  db: Database,
  lines: PaieMasseEmployeeLine[],
  period: string
): Currency {
  if (lines[0]) {
    const emp = db.employees.find((e) => e.id === lines[0].employeeId);
    if (emp) return emp.salary.currency;
  }
  const arch = (db.payslipArchives ?? []).find((a) => a.period === period);
  if (arch) return arch.currency;
  return getPayableEmployees(db)[0]?.salary.currency ?? "USD";
}

export function buildPaieMasseForPeriod(
  db: Database,
  settings: AppSettings,
  period: string
): PaieMasseBreakdown {
  const lines = buildPaieMasseEmployeeLines(db, settings, period);
  const currency = resolveMasseCurrency(db, lines, period);
  if (!lines.length) {
    return emptyPaieMasseBreakdown(period, currency);
  }
  return aggregatePaieMasseFromLines(lines, period, currency);
}

export function totalDecaissement(masse: PaieMasseBreakdown): number {
  return masse.totalNet + masse.totalExtraCosts;
}

export function totalChargesReverser(masse: PaieMasseBreakdown): number {
  return (
    masse.totalCnssEmployee +
    masse.totalCnssEmployer +
    masse.totalIpr +
    masse.totalOnem +
    masse.totalInpp
  );
}

export interface PaieMasseMonthlyPoint {
  period: string;
  month: number;
  monthLabel: string;
  totalGross: number;
  totalNet: number;
  totalDecaissement: number;
  totalCnss: number;
  totalIpr: number;
  totalOnem: number;
  totalInpp: number;
  totalEmployerCost: number;
}

const MONTH_SHORT = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
] as const;

export function buildPaieMasseAnnualSeries(
  db: Database,
  settings: AppSettings,
  year: number
): PaieMasseMonthlyPoint[] {
  const points: PaieMasseMonthlyPoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const period = `${year}-${String(m).padStart(2, "0")}`;
    const masse = buildPaieMasseForPeriod(db, settings, period);
    points.push({
      period,
      month: m,
      monthLabel: MONTH_SHORT[m - 1],
      totalGross: masse.totalGross,
      totalNet: masse.totalNet,
      totalDecaissement: totalDecaissement(masse),
      totalCnss: masse.totalCnssEmployee + masse.totalCnssEmployer,
      totalIpr: masse.totalIpr,
      totalOnem: masse.totalOnem,
      totalInpp: masse.totalInpp,
      totalEmployerCost: masse.totalEmployerCost,
    });
  }
  return points;
}

export interface PaieMasseEmployeeLine {
  employeeId: string;
  matricule: string;
  fullName: string;
  department: string;
  position: string;
  net: number;
  gross: number;
  extraCosts: number;
  decaissement: number;
  cnssEmployee: number;
  cnssEmployer: number;
  ipr: number;
  onem: number;
  inpp: number;
  employerCost: number;
  totalCharges: number;
}

export type PaieMasseMetricKey =
  | "employeeCount"
  | "totalNet"
  | "totalExtraCosts"
  | "totalDecaissement"
  | "totalEmployerCost"
  | "totalGross"
  | "totalCnssEmployee"
  | "totalCnssEmployer"
  | "totalIpr"
  | "totalOnem"
  | "totalInpp"
  | "totalCharges"
  | "departmentNet";

export const PAIE_METRIC_LABELS: Record<PaieMasseMetricKey, string> = {
  employeeCount: "Employés actifs (paie)",
  totalNet: "Net à payer",
  totalExtraCosts: "Coûts extra",
  totalDecaissement: "Total décaissement",
  totalEmployerCost: "Coût employeur",
  totalGross: "Masse brute",
  totalCnssEmployee: "CNSS salarié",
  totalCnssEmployer: "CNSS employeur",
  totalIpr: "IRPP / DGI",
  totalOnem: "ONEM",
  totalInpp: "INPP",
  totalCharges: "Total charges",
  departmentNet: "Net par département",
};

export function buildPaieMasseEmployeeLines(
  db: Database,
  settings: AppSettings,
  period: string
): PaieMasseEmployeeLine[] {
  const current = currentPayPeriod();
  const hasLiveData = period === current;
  const archivedIds = new Set(
    (db.payslipArchives ?? []).filter((a) => a.period === period).map((a) => a.employeeId)
  );
  const hasArchive = archivedIds.size > 0;

  if (!hasLiveData && !hasArchive) return [];

  const active = getPayableEmployees(db);
  const lines: PaieMasseEmployeeLine[] = [];

  for (const emp of active) {
    if (!hasLiveData && hasArchive && !archivedIds.has(emp.id)) continue;

    const position = emp.positionId
      ? db.positions.find((p) => p.id === emp.positionId)
      : undefined;

    let net = 0;
    let gross = 0;
    let cnssEmployee = 0;
    let cnssEmployer = 0;
    let ipr = 0;
    let onem = 0;
    let inpp = 0;
    let employerCost = 0;

    if (hasLiveData) {
      const payroll = computeForEmployee(emp, position, settings);
      net = payroll.netSalary;
      gross = payroll.totalGains ?? payroll.grossSalary;
      cnssEmployee = payroll.cnssEmployee;
      cnssEmployer = payroll.cnssEmployer;
      ipr = payroll.ipr;
      onem = payroll.onem;
      inpp = payroll.inpp;
      employerCost = payroll.totalEmployerCost;
    } else {
      const arch = (db.payslipArchives ?? []).find(
        (a) => a.period === period && a.employeeId === emp.id
      );
      if (arch) net = arch.netSalary;
    }

    const extra =
      hasLiveData && emp.extraCosts ? sumExtraCosts(emp.extraCosts) : 0;
    const totalCharges = cnssEmployee + cnssEmployer + ipr + onem + inpp;

    lines.push({
      employeeId: emp.id,
      matricule: emp.matricule,
      fullName: `${emp.prenom} ${emp.nom}`,
      department: emp.department,
      position: position?.title ?? emp.position,
      net: Math.round(net),
      gross: Math.round(gross),
      extraCosts: Math.round(extra),
      decaissement: Math.round(net + extra),
      cnssEmployee: Math.round(cnssEmployee),
      cnssEmployer: Math.round(cnssEmployer),
      ipr: Math.round(ipr),
      onem: Math.round(onem),
      inpp: Math.round(inpp),
      employerCost: Math.round(employerCost),
      totalCharges: Math.round(totalCharges),
    });
  }

  return lines.sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"));
}

export function masseMetricValue(
  masse: PaieMasseBreakdown,
  metric: PaieMasseMetricKey,
  department?: string
): number {
  if (metric === "departmentNet" || (metric === "totalNet" && department)) {
    const dept = masse.byDepartment.find((d) => d.department === department);
    return dept?.net ?? 0;
  }
  switch (metric) {
    case "employeeCount":
      return masse.employeeCount;
    case "totalNet":
      return masse.totalNet;
    case "totalExtraCosts":
      return masse.totalExtraCosts;
    case "totalDecaissement":
      return totalDecaissement(masse);
    case "totalEmployerCost":
      return masse.totalEmployerCost;
    case "totalGross":
      return masse.totalGross;
    case "totalCnssEmployee":
      return masse.totalCnssEmployee;
    case "totalCnssEmployer":
      return masse.totalCnssEmployer;
    case "totalIpr":
      return masse.totalIpr;
    case "totalOnem":
      return masse.totalOnem;
    case "totalInpp":
      return masse.totalInpp;
    case "totalCharges":
      return totalChargesReverser(masse);
    default:
      return 0;
  }
}

export function metricAmountForEmployee(
  line: PaieMasseEmployeeLine,
  metric: PaieMasseMetricKey
): number {
  switch (metric) {
    case "employeeCount":
      return 1;
    case "totalNet":
    case "departmentNet":
      return line.net;
    case "totalExtraCosts":
      return line.extraCosts;
    case "totalDecaissement":
      return line.decaissement;
    case "totalEmployerCost":
      return line.employerCost;
    case "totalGross":
      return line.gross;
    case "totalCnssEmployee":
      return line.cnssEmployee;
    case "totalCnssEmployer":
      return line.cnssEmployer;
    case "totalIpr":
      return line.ipr;
    case "totalOnem":
      return line.onem;
    case "totalInpp":
      return line.inpp;
    case "totalCharges":
      return line.totalCharges;
    default:
      return 0;
  }
}
