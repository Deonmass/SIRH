import { getSmigRowByGrade, DEFAULT_SMIG_BAREME, smigHousingMonthlyFromPointage } from "@/lib/smig-bareme";
import {
  buildJobPositionPayrollFromSimulator,
  DEFAULT_POINTAGE,
  initSimulatorFromPayroll,
  smigAmountsFromRow,
} from "@/lib/payroll-simulator-config";
import { hasAssignableSlot } from "@/lib/poste-headcount";
import type { AppSettings, Currency, Employee, Grade, JobPosition, JobPositionPayroll, SmigBaremeRow } from "./types";

/** Grade hiérarchique (fiche poste) → grade SMIG par défaut */
export const ORGANIZATION_GRADE_SMIG_GRADE: Record<Grade, number> = {
  Direction: 17,
  "Cadre supérieur": 16,
  Cadre: 14,
  "Agent maîtrise": 11,
  Agent: 7,
  Ouvrier: 2,
};

/** Aligne la config paie sur le grade hiérarchique (catégorie SMIG + barème). */
export function applyOrganizationGradeToPayroll(
  grade: Grade,
  payroll: JobPositionPayroll,
  bareme: SmigBaremeRow[] = DEFAULT_SMIG_BAREME,
  convertAmount: (amount: number, from: Currency, to: Currency) => number = (a, from, to) =>
    from === to ? a : a
): JobPositionPayroll {
  const targetGrade = ORGANIZATION_GRADE_SMIG_GRADE[grade] ?? 3;
  const row = getSmigRowByGrade(bareme, targetGrade) ?? bareme[0];
  const amounts = smigAmountsFromRow(row);
  const daysPresent = payroll.daysPresent ?? DEFAULT_POINTAGE.daysPresent;

  return buildJobPositionPayrollFromSimulator(
    {
      currency: payroll.currency ?? "CDF",
      smigGrade: row.grade,
      smigCategory: row.categoryLabel,
      dailyBaseCdf: amounts.dailyBaseCdf,
      transportDailyCdf: amounts.transportDailyCdf,
      housingMonthlyCdf: smigHousingMonthlyFromPointage(amounts.dailyBaseCdf, daysPresent),
      daysPresent,
      daysSick: payroll.daysSick ?? DEFAULT_POINTAGE.daysSick,
      daysAnnualLeave: payroll.daysAnnualLeave ?? DEFAULT_POINTAGE.daysAnnualLeave,
      daysHoliday: payroll.daysHoliday ?? DEFAULT_POINTAGE.daysHoliday,
      dependents: payroll.dependents ?? DEFAULT_POINTAGE.dependents,
      unionMember: payroll.unionMember ?? false,
      otherDeductions: payroll.otherDeductions ?? DEFAULT_POINTAGE.otherDeductions,
      payrollNotes: payroll.payrollNotes,
      allowances: payroll.allowances,
    },
    bareme,
    convertAmount
  );
}

export function emptyJobPosition(settings: AppSettings): Omit<JobPosition, "id" | "code" | "createdAt" | "updatedAt"> {
  const bareme = settings.smigBareme?.length ? settings.smigBareme : DEFAULT_SMIG_BAREME;
  const grade: Grade = "Agent";
  const payroll = applyOrganizationGradeToPayroll(
    grade,
    {
      baseSalary: 0,
      currency: "CDF",
      category: ORGANIZATION_GRADE_SMIG_GRADE[grade],
      smigGrade: ORGANIZATION_GRADE_SMIG_GRADE[grade],
      housingAllowance: 0,
      transportDaily: 0,
      unionMember: false,
      allowances: [],
      payrollNotes: "",
      daysPresent: 26,
      daysSick: 0,
      daysAnnualLeave: 0,
      daysHoliday: 0,
      dependents: 0,
      otherDeductions: 0,
    },
    bareme
  );
  return {
    title: "",
    department: settings.departments[0] ?? "Ressources Humaines",
    grade,
    reportsToId: null,
    status: "draft",
    contractType: "CDI",
    typeEmp: "interne",
    centreDesCoutsId: null,
    location: "Kinshasa",
    headcount: 1,
    description: "",
    missions: "",
    requirements: "",
    competencies: "",
    kpi: "",
    employeeId: null,
    payroll,
  };
}

export function jobPositionToSalaryPackage(payroll: JobPositionPayroll) {
  return {
    baseSalary: payroll.baseSalary,
    currency: payroll.currency,
    category: payroll.smigGrade ?? payroll.category,
    allowances: payroll.allowances,
  };
}

/** Options calculatePayroll alignées sur le simulateur */
export function jobPositionPayrollOptions(
  payroll: JobPositionPayroll,
  bareme: SmigBaremeRow[]
) {
  const grade = payroll.smigGrade ?? payroll.category;
  const row = getSmigRowByGrade(bareme, grade);
  const base = {
    dependents: payroll.dependents ?? DEFAULT_POINTAGE.dependents,
    housingAllowance: payroll.housingAllowance ?? row?.housingAllowance,
    unionMember: payroll.unionMember ?? false,
  };
  if (!row || payroll.daysPresent == null) return base;
  const init = initSimulatorFromPayroll(payroll, bareme);
  return {
    ...base,
    pointage: {
      dailyBaseSalary: init.dailyBaseCdf,
      transportPerDay: init.transportDailyCdf,
      daysPresent: payroll.daysPresent,
      daysSickMaternity: payroll.daysSick ?? 0,
      daysAnnualLeave: payroll.daysAnnualLeave ?? 0,
      daysHoliday: payroll.daysHoliday ?? 0,
    },
  };
}

export const GRADE_OPTIONS: Grade[] = [
  "Direction",
  "Cadre supérieur",
  "Cadre",
  "Agent maîtrise",
  "Agent",
  "Ouvrier",
];

/** Postes proposés pour l'affectation (vacants, places restantes ou poste déjà lié). */
export function assignablePositionsForEmployee(
  positions: JobPosition[],
  emp: { id: string },
  employees: Employee[]
): JobPosition[] {
  return positions.filter((p) => hasAssignableSlot(p, employees, emp.id));
}

export function statusLabel(status: JobPosition["status"]): string {
  const map: Record<JobPosition["status"], string> = {
    draft: "Brouillon",
    active: "Occupé",
    vacant: "Vacant",
    archived: "Archivé",
  };
  return map[status];
}
