import type { ReportBranding } from "../pdf-branding";
import type { ReportKpi, ReportPeriod, ReportType } from "../types";

export type CharroiReportType = ReportType;

export interface CountRow {
  label: string;
  count: number;
}

export interface CharroiVehiculeRow {
  immatriculation: string;
  marque: string;
  type: string;
  statut: string;
  kmActuel?: number;
}

export interface CharroiCourseRow {
  date: string;
  demandeur: string;
  chauffeur: string;
  type: string;
  vehicule: string;
  destination: string;
  statut: string;
  kmParcours?: number;
}

export interface CharroiPanneRow {
  immatriculation: string;
  marque: string;
  type: string;
  description: string;
  date: string;
  enPanne: boolean;
}

export interface CharroiEntretienRow {
  immatriculation: string;
  marque: string;
  type: string;
  alerte: string;
  kmActuel?: number;
  prochainKm?: number;
  dernierEntretien?: string;
  nbEntretiensPeriode: number;
}

export interface CharroiEntretienHistoriqueRow {
  immatriculation: string;
  date: string;
  types: string;
  km?: number;
  prestataire: string;
  cout?: number;
}

export interface CharroiReportData {
  meta: {
    type: CharroiReportType;
    title: string;
    subtitle: string;
    periodLabel: string;
    year: number;
    month?: number;
    semester?: 1 | 2;
    generatedAt: string;
    companyName: string;
    branding: ReportBranding;
    dateFrom: string;
    dateTo: string;
  };
  kpis: ReportKpi[];
  parc: {
    total: number;
    parStatut: CountRow[];
    parMarque: CountRow[];
    parType: CountRow[];
    disponibles: CharroiVehiculeRow[];
    liste: CharroiVehiculeRow[];
  };
  courses: {
    total: number;
    demandes: number;
    affectees: number;
    enCours: number;
    terminees: number;
    kmParcours: number;
    parStatut: CountRow[];
    parType: CountRow[];
    parChauffeur: CountRow[];
    liste: CharroiCourseRow[];
  };
  pannes: {
    eventsPeriode: number;
    vehiculesEnPanne: number;
    remisesService: number;
    parVehicule: CountRow[];
    liste: CharroiPanneRow[];
  };
  entretien: {
    enRetard: number;
    aPlanifier: number;
    aJour: number;
    historiquePeriode: number;
    kmParcoursPeriode: number;
    alertes: CharroiEntretienRow[];
    historique: CharroiEntretienHistoriqueRow[];
  };
  period: ReportPeriod;
}

export const CHARROI_REPORT_TYPE_LABELS: Record<CharroiReportType, string> = {
  mensuel: "Rapport mensuel Charroi",
  semestriel: "Rapport semestriel Charroi",
  annuel: "Rapport annuel Charroi",
  complet: "Rapport Charroi complet",
};
