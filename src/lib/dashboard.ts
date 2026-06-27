import { STATUS_LABELS } from "./constants";
import { ageFromBirth } from "./seed-employees";
import { calculatePayroll } from "./payroll";
import { LEAVE_TYPE_LABELS } from "./employee-dossier";
import type { CongeWithEmployee, Database, Employee } from "./types";

export interface DashboardAlert {
  id: string;
  type: "warning" | "danger" | "info";
  title: string;
  message: string;
  employeeId?: string;
  employeeName?: string;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  onTrial: number;
  candidates: number;
  onLeave: number;
  onNotice: number;
  turnoverRate: number;
  totalGrossPayroll: number;
  totalNetPayroll: number;
  totalEmployerCost: number;
  avgNetSalary: number;
  documentComplianceRate: number;
  workflowCompletionRate: number;
  avgPerformance: number;
  alerts: DashboardAlert[];
  byDepartment: { name: string; count: number }[];
  byStatus: { status: string; label: string; count: number }[];
  bySexe: { sexe: string; label: string; count: number }[];
  byCategory: { category: number; label: string; count: number }[];
  byGrade: { grade: string; count: number }[];
  byAgeBracket: { bracket: string; count: number }[];
  bySeniority: { bracket: string; count: number }[];
  recruitmentPipeline: { stage: string; count: number }[];
  performanceDistribution: { score: number; count: number }[];
  monthlyPayrollTrend: { month: string; gross: number; net: number }[];
  headcountTrend: { month: string; effectif: number; entrees: number; sorties: number }[];
  pyramideAges: { tranche: string; hommes: number; femmes: number }[];
}

const AGE_BRACKETS = [
  { label: "18-25", min: 18, max: 25 },
  { label: "26-35", min: 26, max: 35 },
  { label: "36-45", min: 36, max: 45 },
  { label: "46-55", min: 46, max: 55 },
  { label: "56+", min: 56, max: 120 },
];

const SENIORITY_BRACKETS = [
  { label: "< 1 an", min: 0, max: 1 },
  { label: "1-3 ans", min: 1, max: 3 },
  { label: "3-5 ans", min: 3, max: 5 },
  { label: "5-10 ans", min: 5, max: 10 },
  { label: "10+ ans", min: 10, max: 100 },
];

export function mergeCongeAlerts(
  alerts: DashboardAlert[],
  conges: CongeWithEmployee[]
): DashboardAlert[] {
  const today = new Date().toISOString().slice(0, 10);
  const inSeven = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const extra: DashboardAlert[] = [];

  conges
    .filter((c) => ["demande", "validation_1", "validation_2"].includes(c.status))
    .slice(0, 8)
    .forEach((c) => {
      const title =
        c.status === "demande"
          ? "Demande de congé à valider"
          : c.status === "validation_1"
            ? "Congé — validation 2 requise"
            : "Congé — validation 1 requise";
      extra.push({
        id: `conge-demande-${c.id}`,
        type: "info",
        title,
        message: `${c.employeeName ?? c.matriculeEmploye} — ${LEAVE_TYPE_LABELS[c.type]} (${c.startDate})`,
        employeeId: c.employeeId,
        employeeName: c.employeeName,
      });
    });

  conges
    .filter(
      (c) =>
        c.status === "approuve" &&
        c.startDate >= today &&
        c.startDate <= inSeven
    )
    .forEach((c) => {
      extra.push({
        id: `conge-soon-${c.id}`,
        type: "warning",
        title: "Congé imminent",
        message: `${c.employeeName ?? c.matriculeEmploye} part le ${c.startDate} (${c.days} j)`,
        employeeId: c.employeeId,
        employeeName: c.employeeName,
      });
    });

  conges
    .filter((c) => c.status === "approuve" && c.startDate <= today && c.endDate >= today)
    .forEach((c) => {
      extra.push({
        id: `conge-en-cours-${c.id}`,
        type: "info",
        title: "Agent en congé",
        message: `${c.employeeName ?? c.matriculeEmploye} — jusqu'au ${c.endDate}`,
        employeeId: c.employeeId,
        employeeName: c.employeeName,
      });
    });

  return [...extra, ...alerts].slice(0, 20);
}

export function computeDashboard(db: Database): DashboardStats {
  const { employees, settings } = db;
  const active = employees.filter((e) => e.status === "actif");
  const alerts: DashboardAlert[] = [];
  const inScope = employees.filter(
    (e) => !["sorti", "licencie"].includes(e.status)
  );

  let totalGross = 0;
  let totalNet = 0;
  let totalCost = 0;
  let perfSum = 0;
  let perfCount = 0;

  employees.forEach((e) => {
    if (["actif", "essai", "conge", "preavis"].includes(e.status)) {
      const p = calculatePayroll(e.salary, settings);
      totalGross += p.grossSalary;
      totalNet += p.netSalary;
      totalCost += p.totalEmployerCost;
    }
    if (e.performanceScore && ["actif", "essai"].includes(e.status)) {
      perfSum += e.performanceScore;
      perfCount++;
    }
    checkEmployeeAlerts(e, alerts);
  });

  const sortis = employees.filter((e) =>
    ["sorti", "licencie"].includes(e.status)
  ).length;
  const turnoverRate = employees.length
    ? (sortis / employees.length) * 100
    : 0;

  const countBy = <K extends string>(
    items: Employee[],
    key: (e: Employee) => K
  ) => {
    const m = new Map<K, number>();
    items.forEach((e) => {
      const k = key(e);
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  };

  const deptMap = countBy(inScope, (e) => e.department);
  const sexeMap = countBy(inScope, (e) => e.sexe);
  const gradeMap = countBy(inScope, (e) => e.grade);
  const catMap = countBy(inScope, (e) => String(e.category));

  const ageBrackets = AGE_BRACKETS.map((b) => ({
    bracket: b.label,
    count: inScope.filter((e) => {
      if (!e.dateNaissance) return false;
      const age = ageFromBirth(e.dateNaissance);
      return age >= b.min && age <= b.max;
    }).length,
  }));

  const seniorityBrackets = SENIORITY_BRACKETS.map((b) => ({
    bracket: b.label,
    count: inScope.filter((e) => {
      if (!e.hireDate) return b.label === "< 1 an";
      const years =
        (Date.now() - new Date(e.hireDate).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000);
      return years >= b.min && years < b.max;
    }).length,
  }));

  const pyramideAges = AGE_BRACKETS.map((b) => ({
    tranche: b.label,
    hommes: inScope.filter((e) => {
      if (!e.dateNaissance || e.sexe !== "M") return false;
      const age = ageFromBirth(e.dateNaissance);
      return age >= b.min && age <= b.max;
    }).length,
    femmes: inScope.filter((e) => {
      if (!e.dateNaissance || e.sexe !== "F") return false;
      const age = ageFromBirth(e.dateNaissance);
      return age >= b.min && age <= b.max;
    }).length,
  }));

  const recruitmentPipeline = [
    { stage: "Candidats", count: employees.filter((e) => e.status === "candidat").length },
    { stage: "Pré-embauche", count: employees.filter((e) => e.status === "pre_embauche").length },
    { stage: "Période d'essai", count: employees.filter((e) => e.status === "essai").length },
    { stage: "Actifs", count: active.length },
  ];

  const performanceDistribution = [1, 2, 3, 4, 5].map((score) => ({
    score,
    count: employees.filter((e) => e.performanceScore === score).length,
  }));

  const statusCounts = new Map<string, number>();
  employees.forEach((e) => {
    statusCounts.set(e.status, (statusCounts.get(e.status) ?? 0) + 1);
  });

  let docsTotal = 0;
  let docsReceived = 0;
  let workflowTotal = 0;
  let workflowDone = 0;
  employees.forEach((e) => {
    e.documents.forEach((d) => {
      if (d.required) {
        docsTotal++;
        if (d.received) docsReceived++;
      }
    });
    e.workflow.forEach((w) => {
      workflowTotal++;
      if (w.completed) workflowDone++;
    });
  });

  const baseEffectif = inScope.length;

  return {
    totalEmployees: employees.length,
    activeEmployees: active.length,
    onTrial: employees.filter((e) => e.status === "essai").length,
    candidates: employees.filter((e) => e.status === "candidat").length,
    onLeave: employees.filter((e) => e.status === "conge").length,
    onNotice: employees.filter((e) => e.status === "preavis").length,
    turnoverRate,
    totalGrossPayroll: totalGross,
    totalNetPayroll: totalNet,
    totalEmployerCost: totalCost,
    avgNetSalary: active.length ? totalNet / active.length : 0,
    avgPerformance: perfCount ? perfSum / perfCount : 0,
    documentComplianceRate: docsTotal ? (docsReceived / docsTotal) * 100 : 100,
    workflowCompletionRate: workflowTotal ? (workflowDone / workflowTotal) * 100 : 0,
    alerts: alerts.slice(0, 15),
    byDepartment: Array.from(deptMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    byStatus: Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      label: STATUS_LABELS[status as keyof typeof STATUS_LABELS]?.label ?? status,
      count,
    })),
    bySexe: [
      { sexe: "M", label: "Hommes", count: sexeMap.get("M") ?? 0 },
      { sexe: "F", label: "Femmes", count: sexeMap.get("F") ?? 0 },
    ],
    byCategory: Array.from(catMap.entries())
      .map(([category, count]) => ({
        category: Number(category),
        label: `Cat. ${category}`,
        count,
      }))
      .sort((a, b) => a.category - b.category),
    byGrade: Array.from(gradeMap.entries())
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => b.count - a.count),
    byAgeBracket: ageBrackets,
    bySeniority: seniorityBrackets,
    recruitmentPipeline,
    performanceDistribution,
    pyramideAges,
    monthlyPayrollTrend: [
      { month: "Jan", gross: totalGross * 0.88, net: totalNet * 0.88 },
      { month: "Fév", gross: totalGross * 0.91, net: totalNet * 0.91 },
      { month: "Mar", gross: totalGross * 0.95, net: totalNet * 0.95 },
      { month: "Avr", gross: totalGross * 0.98, net: totalNet * 0.98 },
      { month: "Mai", gross: totalGross, net: totalNet },
    ],
    headcountTrend: [
      { month: "Jan", effectif: Math.round(baseEffectif * 0.92), entrees: 3, sorties: 1 },
      { month: "Fév", effectif: Math.round(baseEffectif * 0.94), entrees: 5, sorties: 2 },
      { month: "Mar", effectif: Math.round(baseEffectif * 0.97), entrees: 4, sorties: 1 },
      { month: "Avr", effectif: Math.round(baseEffectif * 0.99), entrees: 6, sorties: 3 },
      { month: "Mai", effectif: baseEffectif, entrees: 8, sorties: 2 },
    ],
  };
}

function checkEmployeeAlerts(e: Employee, alerts: DashboardAlert[]) {
  const name = `${e.prenom} ${e.nom}`;

  if (e.contractType === "CDD" && e.contractEndDate) {
    const days = Math.ceil(
      (new Date(e.contractEndDate).getTime() - Date.now()) / 86400000
    );
    if (days > 0 && days <= 30) {
      alerts.push({
        id: `cdd-${e.id}`,
        type: "warning",
        title: "CDD expirant",
        message: `Contrat expire dans ${days} jours (Art. 69)`,
        employeeId: e.id,
        employeeName: name,
      });
    }
  }

  if (e.status === "essai" && e.trialEndDate) {
    const days = Math.ceil(
      (new Date(e.trialEndDate).getTime() - Date.now()) / 86400000
    );
    if (days >= 0 && days <= 7) {
      alerts.push({
        id: `essai-${e.id}`,
        type: "info",
        title: "Fin période d'essai",
        message: `J30 dans ${days} jours — Art. 71-72`,
        employeeId: e.id,
        employeeName: name,
      });
    }
  }

  const missingDocs = e.documents.filter((d) => d.required && !d.received);
  if (
    missingDocs.length > 0 &&
    ["actif", "essai", "pre_embauche"].includes(e.status) &&
    alerts.length < 12
  ) {
    alerts.push({
      id: `docs-${e.id}`,
      type: "danger",
      title: "Dossier incomplet",
      message: `${missingDocs.length} doc. manquant(s)`,
      employeeId: e.id,
      employeeName: name,
    });
  }

  if (e.leaveBalance.remaining > 18 && e.status === "actif") {
    alerts.push({
      id: `conge-${e.id}`,
      type: "warning",
      title: "Congé non pris",
      message: `${e.leaveBalance.remaining} jours restants`,
      employeeId: e.id,
      employeeName: name,
    });
  }

  if (e.warningsCount >= 2) {
    alerts.push({
      id: `warn-${e.id}`,
      type: "danger",
      title: "Risque disciplinaire",
      message: `Avertissement n°${e.warningsCount}`,
      employeeId: e.id,
      employeeName: name,
    });
  }
}
