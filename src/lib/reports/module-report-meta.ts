import type { ReportSectionId } from "./report-narratives";

export type RhModuleReportFocus = "employes" | "postes" | "pointage";

export interface RhModuleReportMeta {
  title: string;
  description: string;
  sectionId: ReportSectionId;
  sectionLabel: string;
  reportHint: string;
}

export const RH_MODULE_REPORT_META: Record<RhModuleReportFocus, RhModuleReportMeta> = {
  employes: {
    title: "Rapports Employés",
    description:
      "Effectifs, dossiers, départements et complétion — export Excel, PDF et PowerPoint avec graphiques",
    sectionId: "effectifs",
    sectionLabel: "Effectifs & organisation",
    reportHint:
      "Les exports direction incluent la section « Effectifs & organisation » (rapport complet selon le type sélectionné).",
  },
  postes: {
    title: "Rapports Postes",
    description:
      "Postes vacants, occupés, organigramme et répartition par département — export Excel, PDF et PowerPoint",
    sectionId: "postes",
    sectionLabel: "Postes & organigramme",
    reportHint:
      "Les exports direction incluent la section « Postes & organigramme » (rapport complet selon le type sélectionné).",
  },
  pointage: {
    title: "Rapports Pointage",
    description:
      "Saisie, retards, absences et heures supplémentaires — export Excel, PDF et PowerPoint",
    sectionId: "pointage",
    sectionLabel: "Pointage & temps de travail",
    reportHint:
      "Les exports direction incluent la section « Pointage & temps de travail » (rapport complet selon le type sélectionné).",
  },
};
