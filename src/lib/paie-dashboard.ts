import { totalExtraCosts } from "@/lib/extra-costs";
import { calculatePayroll } from "@/lib/payroll";
import { resolveWorkMonthMode } from "@/lib/work-month-mode";
import type { AppSettings, Database, Employee } from "@/lib/types";

export interface PaieDashboardStats {
  activeCount: number;
  assignedCount: number;
  totalExtraCostsUsd: number;
  totalGrossMonthly: number;
  totalNetMonthly: number;
  avgExtraPerEmployee: number;
  byDepartmentExtra: { department: string; total: number }[];
}

export function buildPaieDashboard(
  db: Database,
  settings: AppSettings
): PaieDashboardStats {
  const active = db.employees.filter((e) =>
    ["actif", "essai", "conge", "preavis"].includes(e.status)
  );

  let totalExtra = 0;
  let totalGross = 0;
  let totalNet = 0;
  const deptMap = new Map<string, number>();

  for (const emp of active) {
    const costs = emp.extraCosts;
    if (costs) {
      const t = totalExtraCosts(costs);
      totalExtra += t;
      deptMap.set(emp.department, (deptMap.get(emp.department) ?? 0) + t);
    }
    const payroll = calculatePayroll(emp.salary, settings, 0, {
      dependents: emp.family.filter((m) => m.aCharge).length,
      overtime: emp.overtime,
      workMonthMode: resolveWorkMonthMode(emp, settings),
    });
    totalGross += payroll.grossSalary;
    totalNet += payroll.netSalary;
  }

  const assignedCount = active.filter((e) => e.positionId).length;

  return {
    activeCount: active.length,
    assignedCount,
    totalExtraCostsUsd: Math.round(totalExtra),
    totalGrossMonthly: Math.round(totalGross),
    totalNetMonthly: Math.round(totalNet),
    avgExtraPerEmployee: active.length ? Math.round(totalExtra / active.length) : 0,
    byDepartmentExtra: [...deptMap.entries()]
      .map(([department, total]) => ({ department, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8),
  };
}
