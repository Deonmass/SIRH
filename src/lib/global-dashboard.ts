import { MOVEMENT_TYPE_LABELS } from "@/lib/movement-type-labels";
import { buildConformiteDashboard } from "./conformite-dashboard";
import { computeCongesDashboard } from "./conges-dashboard";
import { computeDossierProgressPercent, computeDossierTabCompletions } from "./employee-dossier-completion";
import { buildEmployesDashboard } from "./employes-dashboard";
import { computeFormationsDashboard } from "./formations-dashboard";
import { buildPaieDashboard } from "./paie-dashboard";
import {
  buildPaieMasse,
  buildPaieMasseAnnualSeries,
  buildPaieMasseEmployeeLines,
} from "./paie-masse";
import { currentPayPeriod } from "./payslip-engine";
import { buildPostesDashboard } from "./postes-dashboard";
import { computeDashboard, type DashboardStats } from "./dashboard";
import type { CongeWithEmployee, Database, Employee, FormationRecord, MovementType } from "./types";
import type { PointageDashboardData } from "./pointage-dashboard";

const MONTH_LABELS = [
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

const ENTRY_TYPES = new Set<MovementType>([
  "embauche",
  "affectation",
  "confirmation_contrat",
  "reintegration",
]);

const EXIT_TYPES = new Set<MovementType>([
  "demission",
  "licenciement",
  "retraite",
  "fin_mission",
  "fin_cdd",
]);

const WORKFLOW_LABELS: Record<string, string> = {
  analyse_besoin: "Analyse besoin",
  validation_interne: "Validation interne",
  sourcing: "Sourcing",
  preselection: "Présélection",
  entretiens: "Entretiens",
  verifications: "Vérifications",
  proposition_integration: "Proposition",
  contrat_signature: "Contrat",
  declaration_cnss: "Décl. CNSS",
  declaration_onem: "Décl. ONEM",
  onboarding_j1: "Onboarding J1",
  onboarding_j30: "Onboarding J30",
};

export type PointageDashboardSummary = Pick<
  PointageDashboardData,
  | "moisAnnee"
  | "totalActifs"
  | "feuillesSaisies"
  | "feuillesVerrouillees"
  | "totalRetards"
  | "totalHeuresSup"
  | "totalAbsencesNonJustifiees"
  | "avgJoursPresents"
> & {
  byDepartment: { department: string; retards: number; absences: number; heuresSup: number }[];
  saisieRate: number;
};

export interface GlobalDashboardStats extends DashboardStats {
  year: number;
  employes: ReturnType<typeof buildEmployesDashboard>;
  postes: ReturnType<typeof buildPostesDashboard>;
  paieModule: ReturnType<typeof buildPaieDashboard>;
  conformite: ReturnType<typeof buildConformiteDashboard>;
  conges: {
    monthlyTrend: ReturnType<typeof computeCongesDashboard>["monthlyTrend"];
    byDepartment: { department: string; count: number; onLeave: number }[];
    byType: ReturnType<typeof computeCongesDashboard>["byType"];
    pendingValidations: number;
    onLeaveNow: number;
    totalDaysThisMonth: number;
  };
  formations: ReturnType<typeof computeFormationsDashboard>;
  pointage: PointageDashboardSummary;
  paieMasseSeries: ReturnType<typeof buildPaieMasseAnnualSeries>;
  paieCurrentMasse: ReturnType<typeof buildPaieMasse>;
  paieByDepartment: { department: string; gross: number; net: number; employerCost: number; count: number }[];
  movementSummary: { type: MovementType; label: string; count: number }[];
  leaveBalance: {
    avgRemaining: number;
    highBalance: number;
    zeroBalance: number;
    totalRemaining: number;
  };
  discipline: {
    totalWarnings: number;
    activeCases: number;
    bySeverity: { severity: number; count: number }[];
  };
  workflowSteps: { step: string; label: string; completed: number; total: number; rate: number }[];
  dossierCompletion: { bracket: string; count: number }[];
}

function monthBounds(year: number, monthIndex: number) {
  const start = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const endDay = new Date(year, monthIndex + 1, 0).getDate();
  const end = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  return { start, end };
}

function employeeExitDate(e: Employee): string | undefined {
  const exit = [...e.movements]
    .filter((m) => EXIT_TYPES.has(m.type))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return exit?.effectiveDate ?? exit?.date;
}

function employeeHireDate(e: Employee): string | undefined {
  if (e.hireDate) return e.hireDate;
  const entry = [...e.movements]
    .filter((m) => ENTRY_TYPES.has(m.type))
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return entry?.effectiveDate ?? entry?.date;
}

export function computeRealHeadcountTrend(employees: Employee[], year: number) {
  return MONTH_LABELS.map((month, m) => {
    const { start, end } = monthBounds(year, m);

    let entrees = 0;
    let sorties = 0;

    employees.forEach((e) => {
      const hire = employeeHireDate(e);
      if (hire && hire >= start && hire <= end) entrees++;

      const exit = employeeExitDate(e);
      if (exit && exit >= start && exit <= end) sorties++;
    });

    const effectif = employees.filter((e) => {
      const hire = employeeHireDate(e);
      if (hire && hire > end) return false;
      const exit = employeeExitDate(e);
      if (exit && exit <= end) return false;
      if (["sorti", "licencie"].includes(e.status) && !exit) return false;
      return true;
    }).length;

    return { month, effectif, entrees, sorties };
  });
}

export function computeMovementSummary(employees: Employee[], year: number) {
  const counts = new Map<MovementType, number>();
  employees.forEach((e) => {
    e.movements.forEach((m) => {
      if (!m.date.startsWith(String(year))) return;
      counts.set(m.type, (counts.get(m.type) ?? 0) + 1);
    });
  });
  return [...counts.entries()]
    .map(([type, count]) => ({
      type,
      label: MOVEMENT_TYPE_LABELS[type] ?? type,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function computeLeaveBalance(employees: Employee[]) {
  const active = employees.filter((e) => ["actif", "essai", "conge", "preavis"].includes(e.status));
  if (!active.length) {
    return { avgRemaining: 0, highBalance: 0, zeroBalance: 0, totalRemaining: 0 };
  }
  let total = 0;
  let high = 0;
  let zero = 0;
  active.forEach((e) => {
    const r = e.leaveBalance?.remaining ?? 0;
    total += r;
    if (r > 15) high++;
    if (r <= 0) zero++;
  });
  return {
    avgRemaining: Math.round((total / active.length) * 10) / 10,
    highBalance: high,
    zeroBalance: zero,
    totalRemaining: Math.round(total),
  };
}

function computeDiscipline(employees: Employee[]) {
  let totalWarnings = 0;
  let activeCases = 0;
  const sevMap = new Map<number, number>();
  employees.forEach((e) => {
    totalWarnings += e.warningsCount ?? 0;
    (e.disciplinaryRecords ?? []).forEach((r) => {
      if (r.status === "open" || r.status === "appealed") activeCases++;
      sevMap.set(r.severity, (sevMap.get(r.severity) ?? 0) + 1);
    });
  });
  return {
    totalWarnings,
    activeCases,
    bySeverity: [1, 2, 3, 4, 5].map((severity) => ({
      severity,
      count: sevMap.get(severity) ?? 0,
    })),
  };
}

function computeWorkflowSteps(employees: Employee[]) {
  const stepMap = new Map<string, { completed: number; total: number }>();
  employees.forEach((e) => {
    e.workflow.forEach((w) => {
      const cur = stepMap.get(w.id) ?? { completed: 0, total: 0 };
      cur.total++;
      if (w.completed) cur.completed++;
      stepMap.set(w.id, cur);
    });
  });
  return [...stepMap.entries()]
    .map(([step, v]) => ({
      step,
      label: WORKFLOW_LABELS[step] ?? step,
      completed: v.completed,
      total: v.total,
      rate: v.total ? Math.round((v.completed / v.total) * 100) : 0,
    }))
    .sort((a, b) => a.rate - b.rate);
}

export function computeDossierCompletion(employees: Employee[]) {
  const brackets = [
    { label: "0-25%", min: 0, max: 25 },
    { label: "26-50%", min: 26, max: 50 },
    { label: "51-75%", min: 51, max: 75 },
    { label: "76-99%", min: 76, max: 99 },
    { label: "100%", min: 100, max: 100 },
  ];
  const inScope = employees.filter((e) => !["sorti", "licencie"].includes(e.status));
  return brackets.map((b) => ({
    bracket: b.label,
    count: inScope.filter((e) => {
      const pct = computeDossierProgressPercent(computeDossierTabCompletions(e));
      return pct >= b.min && pct <= b.max;
    }).length,
  }));
}

function summarizePointage(data: PointageDashboardData): PointageDashboardSummary {
  const deptMap = new Map<string, { retards: number; absences: number; heuresSup: number }>();
  data.rows.forEach((r) => {
    if (!r.id) return;
    const dept = r.departement || "Non affecté";
    const cur = deptMap.get(dept) ?? { retards: 0, absences: 0, heuresSup: 0 };
    cur.retards += r.synthese.retards;
    cur.absences += r.synthese.absences_non_justifiees;
    cur.heuresSup += r.synthese.heures_sup_total;
    deptMap.set(dept, cur);
  });

  return {
    moisAnnee: data.moisAnnee,
    totalActifs: data.totalActifs,
    feuillesSaisies: data.feuillesSaisies,
    feuillesVerrouillees: data.feuillesVerrouillees,
    totalRetards: data.totalRetards,
    totalHeuresSup: data.totalHeuresSup,
    totalAbsencesNonJustifiees: data.totalAbsencesNonJustifiees,
    avgJoursPresents: data.avgJoursPresents,
    saisieRate: data.totalActifs
      ? Math.round((data.feuillesSaisies / data.totalActifs) * 100)
      : 0,
    byDepartment: [...deptMap.entries()]
      .map(([department, v]) => ({ department, ...v }))
      .sort((a, b) => b.retards - a.retards)
      .slice(0, 10),
  };
}

function summarizeConges(
  conges: CongeWithEmployee[],
  employees: Employee[],
  year: number,
  month: number
) {
  const full = computeCongesDashboard(conges, employees, year, month);
  const today = new Date().toISOString().slice(0, 10);
  const pending = conges.filter((c) =>
    ["demande", "validation_1", "validation_2"].includes(c.status)
  ).length;
  const onLeaveNow = conges.filter(
    (c) => c.status === "approuve" && c.startDate <= today && c.endDate >= today
  ).length;
  const totalDaysThisMonth = full.byType.reduce((s, t) => s + t.days, 0);

  return {
    monthlyTrend: full.monthlyTrend,
    byDepartment: full.byDepartment.map((d) => ({
      department: d.department,
      count: d.count,
      onLeave: d.onLeave,
    })),
    byType: full.byType,
    pendingValidations: pending,
    onLeaveNow,
    totalDaysThisMonth,
  };
}

export function buildGlobalDashboard(
  db: Database,
  options: {
    conges: CongeWithEmployee[];
    formations: FormationRecord[];
    pointage: PointageDashboardData;
    year?: number;
    month?: number;
  }
): GlobalDashboardStats {
  const year = options.year ?? new Date().getFullYear();
  const month = options.month ?? new Date().getMonth();
  const base = computeDashboard(db);

  const paieMasseSeries = buildPaieMasseAnnualSeries(db, db.settings, year);
  const paieCurrentMasse = buildPaieMasse(db, db.settings);
  const employeeLines = buildPaieMasseEmployeeLines(db, db.settings, currentPayPeriod());

  const deptPayMap = new Map<string, { gross: number; net: number; employerCost: number; count: number }>();
  employeeLines.forEach((line) => {
    const cur = deptPayMap.get(line.department) ?? { gross: 0, net: 0, employerCost: 0, count: 0 };
    cur.gross += line.gross;
    cur.net += line.net;
    cur.employerCost += line.employerCost;
    cur.count++;
    deptPayMap.set(line.department, cur);
  });

  return {
    ...base,
    year,
    monthlyPayrollTrend: paieMasseSeries.map((p) => ({
      month: p.monthLabel,
      gross: p.totalGross,
      net: p.totalNet,
    })),
    headcountTrend: computeRealHeadcountTrend(db.employees, year),
    employes: buildEmployesDashboard(db),
    postes: buildPostesDashboard(db),
    paieModule: buildPaieDashboard(db, db.settings),
    conformite: buildConformiteDashboard(db),
    conges: summarizeConges(options.conges, db.employees, year, month),
    formations: computeFormationsDashboard(options.formations, year),
    pointage: summarizePointage(options.pointage),
    paieMasseSeries,
    paieCurrentMasse,
    paieByDepartment: [...deptPayMap.entries()]
      .map(([department, v]) => ({ department, ...v }))
      .sort((a, b) => b.net - a.net)
      .slice(0, 12),
    movementSummary: computeMovementSummary(db.employees, year),
    leaveBalance: computeLeaveBalance(db.employees),
    discipline: computeDiscipline(db.employees),
    workflowSteps: computeWorkflowSteps(db.employees),
    dossierCompletion: computeDossierCompletion(db.employees),
  };
}
