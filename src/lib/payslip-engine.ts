import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { totalExtraCosts } from "@/lib/extra-costs";
import { calculatePayroll } from "@/lib/payroll";
import { resolveWorkMonthMode } from "@/lib/work-month-mode";
import { jobPositionPayrollOptions, jobPositionToSalaryPackage } from "@/lib/postes";
import type {
  AppSettings,
  Database,
  Employee,
  JobPosition,
  PayslipData,
  PayslipEmployeeSituation,
} from "@/lib/types";

const PAYABLE_STATUSES = ["actif", "essai", "conge", "preavis"] as const;

export function formatPayPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return format(d, "MMMM yyyy", { locale: fr });
}

export function currentPayPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getPayableEmployees(db: Database): Employee[] {
  return db.employees.filter((e) =>
    PAYABLE_STATUSES.includes(e.status as (typeof PAYABLE_STATUSES)[number])
  );
}

function resolvePosition(db: Database, employee: Employee): JobPosition | undefined {
  if (!employee.positionId) return undefined;
  return db.positions.find((p) => p.id === employee.positionId);
}

function computeEmployeePayroll(
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

function buildSituation(
  employee: Employee,
  position: JobPosition | undefined,
  settings: AppSettings
): PayslipEmployeeSituation {
  const payroll = position?.payroll;
  let pointageSummary: string | undefined;
  if (payroll?.daysPresent != null) {
    pointageSummary = `P:${payroll.daysPresent} · M:${payroll.daysSick ?? 0} · CA:${payroll.daysAnnualLeave ?? 0} · F:${payroll.daysHoliday ?? 0}`;
  }

  return {
    matricule: employee.matricule,
    fullName: `${employee.prenom} ${employee.nom}${employee.postNom ? ` ${employee.postNom}` : ""}`,
    department: employee.department,
    position: position?.title ?? employee.position,
    grade: employee.grade,
    cnssNumber: employee.numeroCnss,
    contractType: employee.contractType,
    hireDate: employee.hireDate,
    dependents: employee.family.filter((m) => m.aCharge).length,
    leaveRemaining: employee.leaveBalance.remaining,
    status: employee.status,
    workMonthMode: resolveWorkMonthMode(employee, settings),
    pointageSummary,
  };
}

export function buildPayslipForEmployee(
  employee: Employee,
  db: Database,
  settings: AppSettings,
  period: string
): PayslipData {
  const position = resolvePosition(db, employee);
  const payroll = computeEmployeePayroll(employee, position, settings);

  return {
    id: crypto.randomUUID(),
    employeeId: employee.id,
    period,
    periodLabel: formatPayPeriod(period),
    generatedAt: new Date().toISOString(),
    situation: buildSituation(employee, position, settings),
    payroll,
    currency: payroll.currency,
  };
}

export type PayslipScope = "all" | "department" | "individual";

export function filterEmployeesForScope(
  employees: Employee[],
  scope: PayslipScope,
  department?: string,
  employeeId?: string
): Employee[] {
  if (scope === "individual" && employeeId) {
    return employees.filter((e) => e.id === employeeId);
  }
  if (scope === "department" && department) {
    return employees.filter((e) => e.department === department);
  }
  return employees;
}

export function generatePayslips(
  db: Database,
  settings: AppSettings,
  period: string,
  scope: PayslipScope,
  options?: { department?: string; employeeId?: string }
): PayslipData[] {
  const base = getPayableEmployees(db);
  const selected = filterEmployeesForScope(
    base,
    scope,
    options?.department,
    options?.employeeId
  );
  return selected.map((emp) => buildPayslipForEmployee(emp, db, settings, period));
}

export function payslipExtraTotal(employee: Employee): number {
  return employee.extraCosts ? totalExtraCosts(employee.extraCosts) : 0;
}
