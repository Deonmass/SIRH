import type { GlobalDashboardStats } from "@/lib/global-dashboard";
import { formatCurrency, formatCurrencyForPdf } from "@/lib/utils";
import type { ReportBranding } from "./pdf-branding";
import type { Employee } from "@/lib/types";
import {
  monthIndexesForPeriod,
  monthShortLabels,
  periodLabel,
  periodSubtitle,
} from "./period";
import { REPORT_TYPE_LABELS, type ReportKpi, type ReportPeriod, type RhReportData } from "./types";

function fmtMoney(amount: number, hide: boolean, currency: "USD" | "CDF" = "USD"): string {
  if (hide) return "—";
  return formatCurrencyForPdf(amount, currency);
}

function filterTrendByMonths<T extends { month: string }>(
  rows: T[],
  monthLabels: string[]
): T[] {
  const set = new Set(monthLabels);
  return rows.filter((r) => set.has(r.month));
}

export function buildRhReport(
  stats: GlobalDashboardStats,
  period: ReportPeriod,
  options: {
    hideSalaries: boolean;
    companyName: string;
    branding: ReportBranding;
    employees: Employee[];
  }
): RhReportData {
  const monthIndexes = monthIndexesForPeriod(period);
  const monthsInScope = monthShortLabels(monthIndexes);
  const hide = options.hideSalaries;

  const headcountTrend = filterTrendByMonths(stats.headcountTrend, monthsInScope);
  const payrollTrend = filterTrendByMonths(stats.monthlyPayrollTrend, monthsInScope);
  const paieMasseSeries = stats.paieMasseSeries.filter((_, i) => monthIndexes.includes(i));

  const effectifFin =
    headcountTrend.length > 0
      ? headcountTrend[headcountTrend.length - 1].effectif
      : stats.activeEmployees;
  const entrees = headcountTrend.reduce((s, r) => s + r.entrees, 0);
  const sorties = headcountTrend.reduce((s, r) => s + r.sorties, 0);
  const masseNette = paieMasseSeries.reduce((s, r) => s + r.totalNet, 0);
  const masseBrute = paieMasseSeries.reduce((s, r) => s + r.totalGross, 0);

  const kpis: ReportKpi[] = [
    {
      id: "effectif",
      label: "Effectif actif",
      value: String(effectifFin),
      hint: `${entrees} entrée(s) · ${sorties} sortie(s)`,
      tone: "sky",
    },
    {
      id: "turnover",
      label: "Turnover",
      value: `${stats.turnoverRate.toFixed(1)} %`,
      tone: "amber",
    },
    {
      id: "masse_nette",
      label: "Masse nette (période)",
      value: fmtMoney(masseNette, hide),
      hint: hide ? undefined : `Brut ${fmtMoney(masseBrute, false)}`,
      tone: "emerald",
    },
    {
      id: "conges",
      label: "Congés en cours",
      value: String(stats.conges.onLeaveNow),
      hint: `${stats.conges.pendingValidations} validation(s) en attente`,
      tone: "violet",
    },
    {
      id: "pointage",
      label: "Saisie pointage",
      value: `${stats.pointage.saisieRate} %`,
      hint: `${stats.pointage.feuillesSaisies}/${stats.pointage.totalActifs} feuilles`,
      tone: "slate",
    },
    {
      id: "conformite",
      label: "Conformité dossiers",
      value: `${stats.documentComplianceRate} %`,
      hint: `${stats.conformite.missingDocsTotal ?? 0} pièce(s) manquante(s)`,
      tone: "rose",
    },
  ];

  const filteredStats: GlobalDashboardStats = {
    ...stats,
    headcountTrend,
    monthlyPayrollTrend: payrollTrend,
    paieMasseSeries,
  };

  return {
    meta: {
      type: period.type,
      title: REPORT_TYPE_LABELS[period.type],
      subtitle: periodSubtitle(period),
      periodLabel: periodLabel(period),
      year: period.year,
      month: period.month,
      semester: period.semester,
      generatedAt: new Date().toISOString(),
      companyName: options.companyName,
      hideSalaries: hide,
      branding: options.branding,
    },
    kpis,
    stats: filteredStats,
    monthsInScope,
    monthIndexesInScope: monthIndexes,
  };
}

/** Liste agents pour annexe (rapport complet). */
export function buildEmployeeAnnexRows(employees: Employee[], hideSalaries: boolean) {
  return employees
    .filter((e) => !["sorti", "licencie"].includes(e.status))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
    .map((e) => ({
      matricule: e.matricule,
      nom: `${e.prenom} ${e.nom}`,
      departement: e.department,
      grade: e.grade ?? "—",
      statut: e.status,
      salaireBase: hideSalaries ? "—" : formatCurrency(e.salary.baseSalary, e.salary.currency),
      anciennete: e.hireDate ?? "—",
    }));
}
