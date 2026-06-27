/**
 * Définitions des graphiques PDF — alignées sur `DashboardView.tsx` (onglets Recharts).
 */
import type { jsPDF } from "jspdf";
import {
  DASHBOARD_COLORS,
  drawGroupedBarChart,
  drawHorizontalBarChart,
  drawLineChart,
  drawPieChart,
  drawStackedBarChart,
  drawVerticalBarChart,
  type ChartBounds,
} from "./pdf-charts";
import { setPdfFont } from "./pdf-fonts";
import type { ReportSectionId } from "./report-narratives";
import type { RhReportData } from "./types";

export type PdfChartDef = {
  title: string;
  subtitle: string;
  render: (pdf: jsPDF, plot: ChartBounds) => void;
};

function maskMessage(pdf: jsPDF, plot: ChartBounds) {
  setPdfFont(pdf, "italic");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Montants masqués — permission salaires requise", plot.x + 4, plot.y + plot.h / 2);
}

/** Synthèse / onglet overview */
export function overviewDashboardCharts(data: RhReportData): PdfChartDef[] {
  const s = data.stats;
  const months = data.monthsInScope;
  const hc = s.headcountTrend.filter((r) => months.includes(r.month));
  const pay = s.monthlyPayrollTrend.filter((r) => months.includes(r.month));
  const postesDept = s.postes.byDepartment;

  return [
    {
      title: "Évolution effectifs",
      subtitle: `Entrées / sorties — ${data.meta.year}`,
      render: (p, plot) =>
        drawLineChart(p, plot, hc.map((r) => r.month), [
          { name: "Effectif", values: hc.map((r) => r.effectif), color: DASHBOARD_COLORS.blue },
          { name: "Entrées", values: hc.map((r) => r.entrees), color: DASHBOARD_COLORS.emerald },
          { name: "Sorties", values: hc.map((r) => r.sorties), color: DASHBOARD_COLORS.red },
        ]),
    },
    {
      title: "Masse salariale",
      subtitle: data.meta.hideSalaries ? "Montants masqués" : `Brut vs Net — ${data.meta.year}`,
      render: (p, plot) => {
        if (data.meta.hideSalaries) return maskMessage(p, plot);
        drawGroupedBarChart(p, plot, pay.map((r) => r.month), [
          { name: "Brut", values: pay.map((r) => Math.round(r.gross / 1000)), color: DASHBOARD_COLORS.blue },
          { name: "Net", values: pay.map((r) => Math.round(r.net / 1000)), color: DASHBOARD_COLORS.emerald },
        ]);
      },
    },
    {
      title: "Statuts employés",
      subtitle: "Répartition globale",
      render: (p, plot) => {
        const rows = s.byStatus.filter((x) => x.count > 0);
        drawPieChart(p, plot, rows.map((x) => x.label), rows.map((x) => x.count));
      },
    },
    {
      title: "Postes vacants",
      subtitle: "Par département",
      render: (p, plot) =>
        drawGroupedBarChart(p, plot, postesDept.map((d) => d.department), [
          { name: "Vacants", values: postesDept.map((d) => d.vacant), color: DASHBOARD_COLORS.amber },
          { name: "Occupés", values: postesDept.map((d) => d.occupied), color: DASHBOARD_COLORS.emerald },
        ]),
    },
  ];
}

/** Onglet Effectifs — 10 graphiques */
export function effectifsDashboardCharts(data: RhReportData): PdfChartDef[] {
  const s = data.stats;
  const dept = s.byDepartment;

  return [
    {
      title: "Effectifs par département",
      subtitle: "Hors sortis / licenciés",
      render: (p, plot) =>
        drawHorizontalBarChart(p, plot, dept.map((d) => d.name), dept.map((d) => d.count)),
    },
    {
      title: "Répartition par sexe",
      subtitle: "Parité & diversité",
      render: (p, plot) =>
        drawPieChart(p, plot, s.bySexe.map((x) => x.label), s.bySexe.map((x) => x.count)),
    },
    {
      title: "Pyramide des âges",
      subtitle: "Hommes vs Femmes par tranche",
      render: (p, plot) =>
        drawStackedBarChart(p, plot, s.pyramideAges.map((x) => x.tranche), [
          { name: "Hommes", values: s.pyramideAges.map((x) => x.hommes), color: DASHBOARD_COLORS.blue },
          { name: "Femmes", values: s.pyramideAges.map((x) => x.femmes), color: DASHBOARD_COLORS.pink },
        ]),
    },
    {
      title: "Balance d'ancienneté",
      subtitle: "Répartition par ancienneté",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.bySeniority.map((x) => x.bracket),
          s.bySeniority.map((x) => x.count),
          DASHBOARD_COLORS.violet
        ),
    },
    {
      title: "Par catégorie professionnelle",
      subtitle: "Grille 1 à 7",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.byCategory.map((x) => x.label),
          s.byCategory.map((x) => x.count),
          DASHBOARD_COLORS.emerald
        ),
    },
    {
      title: "Par grade / niveau",
      subtitle: "Classification interne",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.byGrade.map((x) => x.grade),
          s.byGrade.map((x) => x.count),
          DASHBOARD_COLORS.amber
        ),
    },
    {
      title: "Pipeline recrutement",
      subtitle: "Candidats → Actifs",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.recruitmentPipeline.map((x) => x.stage),
          s.recruitmentPipeline.map((x) => x.count),
          DASHBOARD_COLORS.cyan
        ),
    },
    {
      title: "Complétude dossiers",
      subtitle: `Moy. ${s.employes.avgDossierCompletion}%`,
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.dossierCompletion.map((d) => d.bracket),
          s.dossierCompletion.map((d) => d.count),
          DASHBOARD_COLORS.violet
        ),
    },
    {
      title: "Mouvements RH",
      subtitle: `${data.meta.year} — types les plus fréquents`,
      render: (p, plot) =>
        drawHorizontalBarChart(
          p,
          plot,
          s.movementSummary.map((m) => m.label),
          s.movementSummary.map((m) => m.count),
          DASHBOARD_COLORS.indigo
        ),
    },
    {
      title: "Statuts détaillés",
      subtitle: "Tous statuts employés",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.employes.byStatus.map((x) => x.label),
          s.employes.byStatus.map((x) => x.count),
          DASHBOARD_COLORS.sky
        ),
    },
  ];
}

/** Onglet Paie — 8 graphiques */
export function paieDashboardCharts(data: RhReportData): PdfChartDef[] {
  const s = data.stats;
  const months = data.monthsInScope;
  const series = s.paieMasseSeries.filter((p) => months.includes(p.monthLabel));
  const dept = s.paieByDepartment;

  if (data.meta.hideSalaries) {
    return [
      {
        title: "Effectif paiable",
        subtitle: "Agents avec bulletin",
        render: (p, plot) =>
          drawVerticalBarChart(p, plot, ["Actifs paie", "Affectés poste", "Bulletins période"], [
            s.paieModule.activeCount,
            s.paieModule.assignedCount,
            s.paieCurrentMasse.employeeCount,
          ]),
      },
      {
        title: "Par catégorie professionnelle",
        subtitle: "Grille 1 à 7",
        render: (p, plot) =>
          drawVerticalBarChart(
            p,
            plot,
            s.byCategory.map((x) => x.label),
            s.byCategory.map((x) => x.count),
            DASHBOARD_COLORS.emerald
          ),
      },
      {
        title: "Par grade / niveau",
        subtitle: "Classification interne",
        render: (p, plot) =>
          drawVerticalBarChart(
            p,
            plot,
            s.byGrade.map((x) => x.grade),
            s.byGrade.map((x) => x.count),
            DASHBOARD_COLORS.amber
          ),
      },
    ];
  }

  return [
    {
      title: "Masse salariale annuelle",
      subtitle: `${data.meta.year} — brut, net, charges`,
      render: (p, plot) =>
        drawLineChart(p, plot, series.map((x) => x.monthLabel), [
          { name: "Brut", values: series.map((x) => Math.round(x.totalGross / 1000)), color: DASHBOARD_COLORS.blue },
          { name: "Net", values: series.map((x) => Math.round(x.totalNet / 1000)), color: DASHBOARD_COLORS.emerald },
          { name: "Coût empl.", values: series.map((x) => Math.round(x.totalEmployerCost / 1000)), color: DASHBOARD_COLORS.amber },
        ]),
    },
    {
      title: "Charges sociales",
      subtitle: "CNSS, ONEM, INPP, IRPP",
      render: (p, plot) =>
        drawStackedBarChart(p, plot, series.map((x) => x.monthLabel), [
          { name: "CNSS", values: series.map((x) => Math.round(x.totalCnss / 1000)), color: DASHBOARD_COLORS.indigo },
          { name: "IRPP", values: series.map((x) => Math.round(x.totalIpr / 1000)), color: DASHBOARD_COLORS.red },
          { name: "ONEM", values: series.map((x) => Math.round(x.totalOnem / 1000)), color: DASHBOARD_COLORS.amber },
          { name: "INPP", values: series.map((x) => Math.round(x.totalInpp / 1000)), color: DASHBOARD_COLORS.emerald },
        ]),
    },
    {
      title: "Net par département",
      subtitle: "Période courante",
      render: (p, plot) =>
        drawHorizontalBarChart(
          p,
          plot,
          dept.map((d) => d.department),
          dept.map((d) => Math.round(d.net / 1000)),
          DASHBOARD_COLORS.emerald
        ),
    },
    {
      title: "Brut par département",
      subtitle: "Période courante",
      render: (p, plot) =>
        drawHorizontalBarChart(
          p,
          plot,
          dept.map((d) => d.department),
          dept.map((d) => Math.round(d.gross / 1000)),
          DASHBOARD_COLORS.blue
        ),
    },
    {
      title: "Coûts extra par département",
      subtitle: "USD — frais annexes",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.paieModule.byDepartmentExtra.map((d) => d.department),
          s.paieModule.byDepartmentExtra.map((d) => Math.round(d.total / 1000)),
          DASHBOARD_COLORS.amber
        ),
    },
    {
      title: "Coût employeur par département",
      subtitle: "Salaire + charges patronales",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          dept.map((d) => d.department),
          dept.map((d) => Math.round(d.employerCost / 1000)),
          DASHBOARD_COLORS.violet
        ),
    },
    {
      title: "Décaissement mensuel",
      subtitle: "Net + coûts extra",
      render: (p, plot) =>
        drawLineChart(p, plot, series.map((x) => x.monthLabel), [
          {
            name: "Décaissement",
            values: series.map((x) => Math.round(x.totalDecaissement / 1000)),
            color: DASHBOARD_COLORS.cyan,
          },
        ]),
    },
    {
      title: "Effectif paiable",
      subtitle: "Agents avec bulletin",
      render: (p, plot) =>
        drawVerticalBarChart(p, plot, ["Actifs paie", "Affectés poste", "Bulletins période"], [
          s.paieModule.activeCount,
          s.paieModule.assignedCount,
          s.paieCurrentMasse.employeeCount,
        ]),
    },
  ];
}

/** Onglet Congés — 6 graphiques */
export function congesDashboardCharts(data: RhReportData): PdfChartDef[] {
  const s = data.stats;
  const months = data.monthsInScope;
  const trend = s.conges.monthlyTrend.filter((m) => months.includes(m.month));
  const typesCount = s.conges.byType.filter((t) => t.count > 0);
  const typesDays = s.conges.byType.filter((t) => t.days > 0);
  const depts = s.conges.byDepartment.filter((d) => d.onLeave > 0).slice(0, 10);
  const soldeNormal = Math.max(
    0,
    s.paieModule.activeCount - s.leaveBalance.highBalance - s.leaveBalance.zeroBalance
  );

  return [
    {
      title: "Congés par mois",
      subtitle: `${data.meta.year} — agents en congé`,
      render: (p, plot) =>
        drawLineChart(p, plot, trend.map((m) => m.month), [
          { name: "En congé", values: trend.map((m) => m.enConge), color: DASHBOARD_COLORS.sky },
          { name: "Demandes", values: trend.map((m) => m.demandes), color: DASHBOARD_COLORS.amber },
          { name: "Approuvés", values: trend.map((m) => m.approuves), color: DASHBOARD_COLORS.emerald },
        ]),
    },
    {
      title: "Congés par type",
      subtitle: "Mois en cours — nombre",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          typesCount.map((t) => t.label),
          typesCount.map((t) => t.count),
          DASHBOARD_COLORS.blue
        ),
    },
    {
      title: "Jours par type",
      subtitle: "Mois en cours",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          typesDays.map((t) => t.label),
          typesDays.map((t) => t.days),
          DASHBOARD_COLORS.violet
        ),
    },
    {
      title: "Congés par département",
      subtitle: "Agents en congé ce mois",
      render: (p, plot) =>
        drawGroupedBarChart(p, plot, depts.map((d) => d.department), [
          { name: "Effectif dept.", values: depts.map((d) => d.count), color: DASHBOARD_COLORS.indigo },
          { name: "En congé", values: depts.map((d) => d.onLeave), color: DASHBOARD_COLORS.sky },
        ]),
    },
    {
      title: "Soldes congés",
      subtitle: "Répartition des agents actifs",
      render: (p, plot) =>
        drawPieChart(p, plot, ["Solde élevé (>15j)", "Solde normal", "Solde nul"], [
          s.leaveBalance.highBalance,
          soldeNormal,
          s.leaveBalance.zeroBalance,
        ]),
    },
    {
      title: "Statuts congé",
      subtitle: "Agents avec statut « congé »",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          ["En congé (statut)", "Préavis"],
          [s.onLeave, s.onNotice],
          DASHBOARD_COLORS.cyan
        ),
    },
  ];
}

/** Onglet Postes — 6 graphiques */
export function postesDashboardCharts(data: RhReportData): PdfChartDef[] {
  const s = data.stats;
  const months = data.monthsInScope;
  const hc = s.headcountTrend.filter((r) => months.includes(r.month));
  const postesDept = s.postes.byDepartment;

  return [
    {
      title: "Postes par département",
      subtitle: "Total, vacants, occupés",
      render: (p, plot) =>
        drawGroupedBarChart(p, plot, postesDept.map((d) => d.department), [
          { name: "Total", values: postesDept.map((d) => d.total), color: DASHBOARD_COLORS.indigo },
          { name: "Vacants", values: postesDept.map((d) => d.vacant), color: DASHBOARD_COLORS.amber },
          { name: "Occupés", values: postesDept.map((d) => d.occupied), color: DASHBOARD_COLORS.emerald },
        ]),
    },
    {
      title: "Taux d'occupation",
      subtitle: "Par département (%)",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          postesDept.map((d) => d.department),
          postesDept.map((d) => (d.total ? Math.round((d.occupied / d.total) * 100) : 0)),
          DASHBOARD_COLORS.sky
        ),
    },
    {
      title: "Pipeline recrutement",
      subtitle: "Étapes candidature → actif",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.recruitmentPipeline.map((x) => x.stage),
          s.recruitmentPipeline.map((x) => x.count),
          DASHBOARD_COLORS.cyan
        ),
    },
    {
      title: "Vacants vs affectés",
      subtitle: "Vue globale postes",
      render: (p, plot) =>
        drawPieChart(p, plot, ["Vacants", "Occupés", "Archivés"], [
          s.postes.vacant,
          s.postes.occupied,
          s.postes.archived,
        ]),
    },
    {
      title: "Entrées / sorties",
      subtitle: `Mouvements ${data.meta.year}`,
      render: (p, plot) =>
        drawLineChart(p, plot, hc.map((r) => r.month), [
          { name: "Entrées", values: hc.map((r) => r.entrees), color: DASHBOARD_COLORS.emerald },
          { name: "Sorties", values: hc.map((r) => r.sorties), color: DASHBOARD_COLORS.red },
        ]),
    },
    {
      title: "Top postes vacants",
      subtitle: "Codes postes disponibles",
      render: (p, plot) =>
        drawHorizontalBarChart(
          p,
          plot,
          s.postes.topVacant.map((p) => p.code || p.title),
          s.postes.topVacant.map(() => 1),
          DASHBOARD_COLORS.amber
        ),
    },
  ];
}

/** Onglet Formation — 6 graphiques */
export function formationsDashboardCharts(data: RhReportData): PdfChartDef[] {
  const s = data.stats;
  const months = data.monthsInScope;
  const trend = s.formations.monthlyTrend.filter((m) => months.includes(m.month));
  const upcoming = s.formations.upcoming.slice(0, 6);

  return [
    {
      title: "Formations par mois",
      subtitle: String(data.meta.year),
      render: (p, plot) =>
        drawLineChart(p, plot, trend.map((m) => m.month), [
          { name: "À venir", values: trend.map((m) => m.aVenir), color: DASHBOARD_COLORS.sky },
          { name: "En cours", values: trend.map((m) => m.enCours), color: DASHBOARD_COLORS.amber },
          { name: "Terminées", values: trend.map((m) => m.terminees), color: DASHBOARD_COLORS.emerald },
        ]),
    },
    {
      title: "Statut formations",
      subtitle: "Répartition globale",
      render: (p, plot) =>
        drawPieChart(p, plot, ["À venir", "En cours", "Terminées"], [
          s.formations.aVenir,
          s.formations.enCours,
          s.formations.terminees,
        ]),
    },
    {
      title: "Distribution performance",
      subtitle: "Score /5",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.performanceDistribution.map((x) => String(x.score)),
          s.performanceDistribution.map((x) => x.count),
          DASHBOARD_COLORS.violet
        ),
    },
    {
      title: "Discipline par gravité",
      subtitle: "Incidents enregistrés",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.discipline.bySeverity.map((x) => String(x.severity)),
          s.discipline.bySeverity.map((x) => x.count),
          DASHBOARD_COLORS.red
        ),
    },
    {
      title: "Workflow onboarding",
      subtitle: "Taux de complétion par étape",
      render: (p, plot) =>
        drawHorizontalBarChart(
          p,
          plot,
          s.workflowSteps.slice(0, 10).map((w) => w.label),
          s.workflowSteps.slice(0, 10).map((w) => w.rate),
          DASHBOARD_COLORS.indigo
        ),
    },
    {
      title: "Formations à venir",
      subtitle: "Prochaines sessions",
      render: (p, plot) =>
        drawHorizontalBarChart(
          p,
          plot,
          upcoming.map((f) => f.titre),
          upcoming.map((f) => f.participantCount),
          DASHBOARD_COLORS.violet
        ),
    },
  ];
}

/** Onglet Conformité — graphiques hors pointage détaillé */
export function conformiteDashboardCharts(data: RhReportData): PdfChartDef[] {
  const s = data.stats;
  const gaps = s.conformite.fieldGaps.filter((g) => g.count > 0);

  return [
    {
      title: "Documents manquants",
      subtitle: "Top pièces non reçues",
      render: (p, plot) =>
        drawHorizontalBarChart(
          p,
          plot,
          s.conformite.topMissingDocs.map((d) => d.label),
          s.conformite.topMissingDocs.map((d) => d.count),
          DASHBOARD_COLORS.red
        ),
    },
    {
      title: "Champs dossier manquants",
      subtitle: "Données administratives",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          gaps.map((g) => g.label),
          gaps.map((g) => g.count),
          DASHBOARD_COLORS.amber
        ),
    },
    {
      title: "Complétude dossiers",
      subtitle: "Distribution par tranche",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.dossierCompletion.map((d) => d.bracket),
          s.dossierCompletion.map((d) => d.count),
          DASHBOARD_COLORS.violet
        ),
    },
    {
      title: "Workflow global",
      subtitle: `${Math.round(s.workflowCompletionRate)}% complété`,
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.workflowSteps.map((w) => w.label),
          s.workflowSteps.map((w) => w.rate),
          DASHBOARD_COLORS.emerald
        ),
    },
    {
      title: "Cotisations CNSS",
      subtitle: "Masse et total mensuel",
      render: (p, plot) => {
        if (data.meta.hideSalaries) return maskMessage(p, plot);
        drawVerticalBarChart(
          p,
          plot,
          ["Masse cotisable", "Total cotisations"],
          [
            Math.round(s.conformite.cnssMasseCotisable / 1000),
            Math.round(s.conformite.cnssTotalCotisations / 1000),
          ],
          DASHBOARD_COLORS.indigo
        );
      },
    },
  ];
}

/** Section pointage (extrait onglet Conformité dashboard) */
export function pointageDashboardCharts(data: RhReportData): PdfChartDef[] {
  const s = data.stats;
  const dept = s.pointage.byDepartment;

  return [
    {
      title: "Pointage — retards",
      subtitle: `${s.pointage.moisAnnee} par département`,
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          dept.map((d) => d.department),
          dept.map((d) => d.retards),
          DASHBOARD_COLORS.amber
        ),
    },
    {
      title: "Pointage — absences",
      subtitle: "Non justifiées par département",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          dept.map((d) => d.department),
          dept.map((d) => d.absences),
          DASHBOARD_COLORS.red
        ),
    },
    {
      title: "Pointage — heures sup.",
      subtitle: "Par département",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          dept.map((d) => d.department),
          dept.map((d) => d.heuresSup),
          DASHBOARD_COLORS.emerald
        ),
    },
    {
      title: "Synthèse pointage",
      subtitle: "Indicateurs du mois",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          ["Retards", "Absences NJ", "Heures sup.", "Jours présents moy.", "Verrouillées"],
          [
            s.pointage.totalRetards,
            s.pointage.totalAbsencesNonJustifiees,
            s.pointage.totalHeuresSup,
            s.pointage.avgJoursPresents,
            s.pointage.feuillesVerrouillees,
          ],
          DASHBOARD_COLORS.sky
        ),
    },
    {
      title: "Taux de saisie",
      subtitle: `${s.pointage.saisieRate}% — ${s.pointage.feuillesSaisies}/${s.pointage.totalActifs}`,
      render: (p, plot) =>
        drawPieChart(p, plot, ["Saisies", "Manquantes"], [
          s.pointage.feuillesSaisies,
          Math.max(0, s.pointage.totalActifs - s.pointage.feuillesSaisies),
        ]),
    },
  ];
}

/** Mouvements RH (rapport annuel / complet) */
export function mouvementsDashboardCharts(data: RhReportData): PdfChartDef[] {
  const s = data.stats;
  const months = data.monthsInScope;
  const hc = s.headcountTrend.filter((r) => months.includes(r.month));

  return [
    {
      title: "Mouvements RH",
      subtitle: `Types les plus fréquents — ${data.meta.year}`,
      render: (p, plot) =>
        drawHorizontalBarChart(
          p,
          plot,
          s.movementSummary.map((m) => m.label),
          s.movementSummary.map((m) => m.count),
          DASHBOARD_COLORS.indigo
        ),
    },
    {
      title: "Entrées / sorties",
      subtitle: "Flux mensuel",
      render: (p, plot) =>
        drawLineChart(p, plot, hc.map((r) => r.month), [
          { name: "Entrées", values: hc.map((r) => r.entrees), color: DASHBOARD_COLORS.emerald },
          { name: "Sorties", values: hc.map((r) => r.sorties), color: DASHBOARD_COLORS.red },
        ]),
    },
    {
      title: "Pipeline recrutement",
      subtitle: "Candidats → actifs",
      render: (p, plot) =>
        drawVerticalBarChart(
          p,
          plot,
          s.recruitmentPipeline.map((x) => x.stage),
          s.recruitmentPipeline.map((x) => x.count),
          DASHBOARD_COLORS.cyan
        ),
    },
    {
      title: "Workflow onboarding",
      subtitle: "Complétion % par étape",
      render: (p, plot) =>
        drawHorizontalBarChart(
          p,
          plot,
          s.workflowSteps.slice(0, 10).map((w) => w.label),
          s.workflowSteps.slice(0, 10).map((w) => w.rate),
          DASHBOARD_COLORS.violet
        ),
    },
  ];
}

export function chartsForReportSection(sectionId: ReportSectionId, data: RhReportData): PdfChartDef[] {
  switch (sectionId) {
    case "synthese":
      return overviewDashboardCharts(data);
    case "effectifs":
      return effectifsDashboardCharts(data);
    case "paie":
      return paieDashboardCharts(data);
    case "conges":
      return congesDashboardCharts(data);
    case "postes":
      return postesDashboardCharts(data);
    case "pointage":
      return pointageDashboardCharts(data);
    case "formations":
      return formationsDashboardCharts(data);
    case "conformite":
      return conformiteDashboardCharts(data);
    case "mouvements":
      return mouvementsDashboardCharts(data);
    default:
      return [];
  }
}
