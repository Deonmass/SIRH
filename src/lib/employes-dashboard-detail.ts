import { computeDashboard } from "./dashboard";
import { buildEmployesDashboard } from "./employes-dashboard";
import {
  computeDossierCompletion,
  computeMovementSummary,
  computeRealHeadcountTrend,
} from "./global-dashboard";
import { MOIS_FR_OPTIONS } from "./pointage-utils";
import type { Database } from "./types";

export type EmployesDashboardDetail = {
  year: number;
  month: number | null;
  periodLabel: string;
  summary: {
    total: number;
    active: number;
    unassigned: number;
    departmentCount: number;
    candidates: number;
    onTrial: number;
    avgDossierCompletion: number;
    onLeave: number;
    onNotice: number;
    entrees: number;
    sorties: number;
    turnoverRate: number;
    effectifFinPeriode: number;
  };
  headcountTrend: { month: string; effectif: number; entrees: number; sorties: number }[];
  byDepartment: { name: string; count: number }[];
  byStatus: { status: string; label: string; count: number }[];
  bySexe: { sexe: string; label: string; count: number }[];
  pyramideAges: { tranche: string; hommes: number; femmes: number }[];
  bySeniority: { bracket: string; count: number }[];
  byCategory: { category: number; label: string; count: number }[];
  byGrade: { grade: string; count: number }[];
  recruitmentPipeline: { stage: string; count: number }[];
  dossierCompletion: { bracket: string; count: number }[];
  movementSummary: { type: string; label: string; count: number }[];
  recentHires: { id: string; name: string; department: string; hireDate?: string }[];
  byDepartmentTop: { department: string; count: number }[];
};

function periodLabel(year: number, month: number | null): string {
  if (month == null) return `Année ${year}`;
  const label = MOIS_FR_OPTIONS.find((m) => m.value === month)?.label ?? String(month);
  return `${label} ${year}`;
}

function filterRecentHires(
  employees: Database["employees"],
  year: number,
  month: number | null
) {
  const IN_SCOPE = ["actif", "essai", "conge", "preavis", "candidat", "pre_embauche", "sorti", "licencie"];
  const prefix =
    month != null ? `${year}-${String(month).padStart(2, "0")}` : String(year);

  return [...employees]
    .filter((e) => IN_SCOPE.includes(e.status) && e.hireDate?.startsWith(prefix))
    .sort((a, b) => (b.hireDate ?? "").localeCompare(a.hireDate ?? ""))
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      name: `${e.prenom} ${e.nom}`,
      department: e.department,
      hireDate: e.hireDate,
    }));
}

export function buildEmployesDashboardDetail(
  db: Database,
  options: { year: number; month?: number | null }
): EmployesDashboardDetail {
  const year = options.year;
  const month = options.month ?? null;
  const base = buildEmployesDashboard(db);
  const charts = computeDashboard(db);
  const headcountTrend = computeRealHeadcountTrend(db.employees, year);

  let entrees = 0;
  let sorties = 0;
  let effectifFinPeriode = base.active;

  if (month != null) {
    const row = headcountTrend[month - 1];
    if (row) {
      entrees = row.entrees;
      sorties = row.sorties;
      effectifFinPeriode = row.effectif;
    }
  } else {
    entrees = headcountTrend.reduce((s, r) => s + r.entrees, 0);
    sorties = headcountTrend.reduce((s, r) => s + r.sorties, 0);
    const lastWithData = [...headcountTrend].reverse().find((r) => r.effectif > 0);
    effectifFinPeriode = lastWithData?.effectif ?? base.active;
  }

  return {
    year,
    month,
    periodLabel: periodLabel(year, month),
    summary: {
      total: base.total,
      active: base.active,
      unassigned: base.unassigned,
      departmentCount: base.departmentCount,
      candidates: base.candidates,
      onTrial: base.onTrial,
      avgDossierCompletion: base.avgDossierCompletion,
      onLeave: charts.onLeave,
      onNotice: charts.onNotice,
      entrees,
      sorties,
      turnoverRate: charts.turnoverRate,
      effectifFinPeriode,
    },
    headcountTrend,
    byDepartment: charts.byDepartment,
    byStatus: base.byStatus.map((s) => ({
      status: s.status,
      label: s.label,
      count: s.count,
    })),
    bySexe: charts.bySexe,
    pyramideAges: charts.pyramideAges,
    bySeniority: charts.bySeniority,
    byCategory: charts.byCategory,
    byGrade: charts.byGrade,
    recruitmentPipeline: charts.recruitmentPipeline,
    dossierCompletion: computeDossierCompletion(db.employees),
    movementSummary: computeMovementSummary(db.employees, year),
    recentHires: filterRecentHires(db.employees, year, month),
    byDepartmentTop: base.byDepartment,
  };
}
