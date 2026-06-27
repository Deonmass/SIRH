import type { RhReportData } from "./types";

export type ReportSectionId =
  | "synthese"
  | "effectifs"
  | "paie"
  | "conges"
  | "postes"
  | "pointage"
  | "formations"
  | "conformite"
  | "mouvements";

export const REPORT_SECTION_LABELS: Record<ReportSectionId, string> = {
  synthese: "Synthèse direction",
  effectifs: "Effectifs & organisation",
  paie: "Paie & masse salariale",
  conges: "Congés & absences",
  postes: "Postes & organigramme",
  pointage: "Pointage & temps de travail",
  formations: "Formations & compétences",
  conformite: "Conformité & dossiers",
  mouvements: "Mouvements RH",
};

export function sectionsForReport(data: RhReportData): ReportSectionId[] {
  const base: ReportSectionId[] = [
    "synthese",
    "effectifs",
    "paie",
    "conges",
    "postes",
    "pointage",
    "formations",
    "conformite",
  ];
  if (data.meta.type === "annuel" || data.meta.type === "complet") {
    base.push("mouvements");
  }
  return base;
}

function topDepartment(data: RhReportData): string {
  const top = data.stats.byDepartment[0];
  return top ? `${top.name} (${top.count})` : "—";
}

export function narrativeForSection(data: RhReportData, section: ReportSectionId): {
  headline: string;
  paragraphs: string[];
  insights: string[];
  chartCaption: string;
} {
  const s = data.stats;
  const period = data.meta.periodLabel;

  switch (section) {
    case "synthese":
      return {
        headline: `Vue d'ensemble — ${period}`,
        paragraphs: [
          `Ce rapport consolide les indicateurs RH de ${data.meta.companyName} pour ${period}. Il s'appuie sur les données employés, paie, congés, pointage et conformité enregistrées dans le SIRH.`,
          `L'effectif actif s'élève à ${s.activeEmployees} collaborateurs, avec un turnover de ${s.turnoverRate.toFixed(1)} %. Le département le plus représenté est ${topDepartment(data)}.`,
          data.meta.hideSalaries
            ? "Les montants salariaux sont masqués dans ce document conformément aux droits d'accès de l'utilisateur."
            : `La masse salariale nette sur la période analysée reflète ${data.kpis.find((k) => k.id === "masse_nette")?.value ?? "—"} au titre de la rémunération directe.`,
        ],
        insights: data.kpis.map((k) => `${k.label} : ${k.value}${k.hint ? ` (${k.hint})` : ""}`),
        chartCaption: "Les six indicateurs clés ci-dessous structurent le pilotage RH de la période.",
      };

    case "effectifs":
      return {
        headline: "Dynamique des effectifs",
        paragraphs: [
          `L'évolution mensuelle des effectifs montre les entrées, sorties et l'effectif fin de mois sur ${data.monthsInScope.join(", ")}.`,
          `La pyramide des âges et la répartition par grade permettent d'anticiper les besoins de renouvellement et de succession. ${s.byGrade.length} grades distincts sont représentés.`,
          s.turnoverRate > 15
            ? "Le taux de turnover dépasse 15 % : un plan de rétention et d'analyse des causes de départ est recommandé."
            : "Le turnover reste dans une fourchette maîtrisée ; maintenir l'attention sur l'onboarding et la fidélisation.",
        ],
        insights: [
          `Répartition H/F : ${s.bySexe.map((x) => `${x.label} ${x.count}`).join(" · ") || "—"}`,
          `Pipeline recrutement : ${s.recruitmentPipeline.reduce((n, p) => n + p.count, 0)} candidat(s) en cours`,
          `Complétion workflow : ${s.workflowCompletionRate} %`,
        ],
        chartCaption:
          "Graphique 1 — Effectif par département. Le volume par service oriente les arbitrages d'affectation et de charge.",
      };

    case "paie":
      return {
        headline: "Masse salariale et coûts",
        paragraphs: data.meta.hideSalaries
          ? [
              "Les données de rémunération sont confidentielles pour ce profil utilisateur.",
              "Consultez un responsable disposant de la permission « Voir les montants salariaux » pour obtenir le détail brut/net et les charges employeur.",
            ]
          : [
              `La masse salariale brute et nette est ventilée par mois et par département sur ${period}.`,
              `Le coût employeur intègre CNSS, INPP, ONEM et charges patronales. Le département ${s.paieByDepartment[0]?.department ?? "—"} concentre la masse nette la plus élevée.`,
              s.paieMasseSeries.length > 1
                ? "Comparer la tendance mensuelle permet d'identifier les écarts saisonniers (primes, embauches, départs)."
                : "Période courte : compléter avec les clôtures paie mensuelles pour une vision annuelle.",
            ],
        insights: data.meta.hideSalaries
          ? ["Données salariales masquées"]
          : [
              `Masse nette période : ${data.kpis.find((k) => k.id === "masse_nette")?.value ?? "—"}`,
              `Salaire net moyen : ${Math.round(s.avgNetSalary).toLocaleString("fr-FR")} $US`,
              `Coût employeur total (mois courant) : ${Math.round(s.totalEmployerCost).toLocaleString("fr-FR")} $US`,
            ],
        chartCaption:
          "Graphique 2 — Évolution de la masse nette (k$US). Chaque barre correspond à un mois de la période sélectionnée.",
      };

    case "conges":
      return {
        headline: "Congés et disponibilité",
        paragraphs: [
          `${s.conges.onLeaveNow} collaborateur(s) sont en congé à la date du rapport. ${s.conges.pendingValidations} demande(s) attendent une validation.`,
          `Les congés par type (annuel, circonstance, maladie…) impactent directement la planification opérationnelle et le solde des droits.`,
          s.leaveBalance.highBalance > 0
            ? `${s.leaveBalance.highBalance} agent(s) dépassent 15 jours de solde restant : risque de congestion en fin d'exercice.`
            : "Les soldes de congés restent globalement équilibrés sur le périmètre actif.",
        ],
        insights: [
          `Solde moyen restant : ${s.leaveBalance.avgRemaining} j`,
          `Total jours congés (période) : ${s.conges.totalDaysThisMonth}`,
          `Top département demandes : ${s.conges.byDepartment[0]?.department ?? "—"}`,
        ],
        chartCaption:
          "Graphique 3 — Répartition des congés par type. Les volumes en jours traduisent l'absentéisme planifié.",
      };

    case "postes":
      return {
        headline: "Postes et organigramme",
        paragraphs: [
          `${s.postes.total} poste(s) actif(s) dont ${s.postes.vacant} vacant(s) et ${s.postes.occupied} occupé(s). Taux d'occupation global : ${s.postes.total ? Math.round((s.postes.occupied / s.postes.total) * 100) : 0} %.`,
          `Répartis sur ${s.postes.departmentCount} département(s). ${s.postes.archived} poste(s) archivé(s) hors organigramme courant.`,
          s.postes.vacant > 0
            ? `${s.postes.vacant} poste(s) à pourvoir : prioriser le recrutement sur les codes les plus critiques.`
            : "Tous les postes actifs sont pourvus ou en cours de recrutement.",
        ],
        insights: [
          `Vacants : ${s.postes.vacant}`,
          `Occupés : ${s.postes.occupied}`,
          `Top vacant : ${s.postes.topVacant[0]?.code ?? s.postes.topVacant[0]?.title ?? "—"}`,
        ],
        chartCaption:
          "Graphiques alignés sur l'onglet Postes du tableau de bord — répartition, occupation et pipeline.",
      };

    case "pointage":
      return {
        headline: "Pointage et discipline horaire",
        paragraphs: [
          `Mois de référence pointage : ${s.pointage.moisAnnee}. Taux de saisie : ${s.pointage.saisieRate} % (${s.pointage.feuillesSaisies}/${s.pointage.totalActifs} feuilles).`,
          `${s.pointage.totalRetards} retard(s), ${s.pointage.totalAbsencesNonJustifiees} absence(s) non justifiée(s) et ${s.pointage.totalHeuresSup} heure(s) supplémentaire(s) ont été enregistrés.`,
          s.pointage.saisieRate < 80
            ? "Le taux de saisie est insuffisant : renforcer le rappel aux managers pour verrouiller les feuilles avant clôture paie."
            : "Bonne couverture de saisie : les données pointage sont fiables pour la paie et le suivi social.",
        ],
        insights: s.pointage.byDepartment.slice(0, 3).map(
          (d) => `${d.department} : ${d.retards} retards, ${d.heuresSup} h sup.`
        ),
        chartCaption:
          "Graphique 4 — Retards par département. Permet de cibler les actions de proximité avec les équipes.",
      };

    case "formations":
      return {
        headline: "Plan de formation",
        paragraphs: [
          `${s.formations.total} session(s) de formation sur l'année, ${s.formations.totalParticipants} participation(s) cumulées.`,
          `${s.formations.aVenir} session(s) à venir, ${s.formations.enCours} en cours et ${s.formations.terminees} terminée(s).`,
          "Aligner le plan de formation sur les compétences clés des postes vacants et les écarts de dossier identifiés en conformité.",
        ],
        insights: [
          `Sessions à venir : ${s.formations.aVenir}`,
          `Taux de réalisation : ${s.formations.total ? Math.round((s.formations.terminees / s.formations.total) * 100) : 0} %`,
        ],
        chartCaption:
          "Graphique 5 — Sessions par mois (à venir / en cours / terminées). Pilotage du calendrier formation.",
      };

    case "conformite":
      return {
        headline: "Conformité administrative",
        paragraphs: [
          `Taux de conformité documentaire : ${s.documentComplianceRate} %. ${s.conformite.incompleteDossiers} dossier(s) incomplet(s), ${s.conformite.missingDocsTotal} pièce(s) manquante(s).`,
          `${s.conformite.sansNumeroCnss} agent(s) sans numéro CNSS renseigné — bloquant pour les déclarations sociales.`,
          "Un dossier RH complet sécurise les audits CNSS/ONEM/INPP et réduit les risques contentieux.",
        ],
        insights: s.conformite.topMissingDocs.slice(0, 4).map((d) => `« ${d.label} » : ${d.count} manquant(s)`),
        chartCaption:
          "Graphique 6 — Complétion des dossiers par tranche (%). Objectif : ramener les effectifs sous 76 % vers 100 %.",
      };

    case "mouvements":
      return {
        headline: "Flux RH et mouvements",
        paragraphs: [
          `Synthèse des mouvements enregistrés sur ${data.meta.year} : embauches, affectations, départs et fins de contrat.`,
          s.movementSummary[0]
            ? `Mouvement le plus fréquent : ${s.movementSummary[0].label} (${s.movementSummary[0].count} occurrence(s)).`
            : "Aucun mouvement significatif enregistré sur la période.",
          "Croiser ces flux avec l'organigramme et les postes vacants pour ajuster le plan de recrutement.",
        ],
        insights: s.movementSummary.slice(0, 5).map((m) => `${m.label} : ${m.count}`),
        chartCaption:
          "Graphique 7 — Volume par type de mouvement. Reflète la dynamique entrées/sorties de l'organisation.",
      };
  }
}
