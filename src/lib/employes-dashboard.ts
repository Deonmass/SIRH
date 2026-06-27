import { STATUS_LABELS } from "./constants";
import { computeDossierProgressPercent, computeDossierTabCompletions } from "./employee-dossier-completion";
import type { Database, EmployeeStatus } from "./types";

export interface EmployesDashboardStats {
  total: number;
  active: number;
  unassigned: number;
  departmentCount: number;
  candidates: number;
  onTrial: number;
  avgDossierCompletion: number;
  byStatus: { status: EmployeeStatus; label: string; count: number }[];
  byDepartment: { department: string; count: number }[];
  recentHires: { id: string; name: string; department: string; hireDate?: string }[];
}

const IN_SCOPE = ["actif", "essai", "conge", "preavis", "candidat", "pre_embauche"];

export function buildEmployesDashboard(db: Database): EmployesDashboardStats {
  const { employees } = db;
  const inScope = employees.filter((e) => IN_SCOPE.includes(e.status));
  const active = employees.filter((e) => e.status === "actif");

  const deptSet = new Set(inScope.map((e) => e.department).filter(Boolean));
  const deptMap = new Map<string, number>();
  inScope.forEach((e) => {
    deptMap.set(e.department, (deptMap.get(e.department) ?? 0) + 1);
  });

  const statusMap = new Map<EmployeeStatus, number>();
  employees.forEach((e) => {
    statusMap.set(e.status, (statusMap.get(e.status) ?? 0) + 1);
  });

  let completionSum = 0;
  inScope.forEach((e) => {
    const tabs = computeDossierTabCompletions(e);
    completionSum += computeDossierProgressPercent(tabs);
  });

  const recentHires = [...inScope]
    .filter((e) => e.hireDate)
    .sort((a, b) => (b.hireDate ?? "").localeCompare(a.hireDate ?? ""))
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      name: `${e.prenom} ${e.nom}`,
      department: e.department,
      hireDate: e.hireDate,
    }));

  return {
    total: employees.length,
    active: active.length,
    unassigned: inScope.filter((e) => !e.positionId).length,
    departmentCount: deptSet.size,
    candidates: employees.filter((e) => e.status === "candidat").length,
    onTrial: employees.filter((e) => e.status === "essai").length,
    avgDossierCompletion: inScope.length ? Math.round(completionSum / inScope.length) : 0,
    byStatus: (Object.keys(STATUS_LABELS) as EmployeeStatus[])
      .map((status) => ({
        status,
        label: STATUS_LABELS[status].label,
        count: statusMap.get(status) ?? 0,
      }))
      .filter((s) => s.count > 0),
    byDepartment: [...deptMap.entries()]
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    recentHires,
  };
}
