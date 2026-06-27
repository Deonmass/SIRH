import type { GlobalDashboardStats } from "@/lib/global-dashboard";
import type { ReportBranding } from "./pdf-branding";

export type ReportType = "mensuel" | "semestriel" | "annuel" | "complet";

export type ReportFormat = "excel" | "pdf" | "pptx";

export interface ReportPeriod {
  type: ReportType;
  year: number;
  /** 1–12 pour mensuel */
  month?: number;
  /** 1 ou 2 pour semestriel */
  semester?: 1 | 2;
}

export interface ReportKpi {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone?: "sky" | "emerald" | "amber" | "rose" | "violet" | "slate";
}

export interface RhReportData {
  meta: {
    type: ReportType;
    title: string;
    subtitle: string;
    periodLabel: string;
    year: number;
    month?: number;
    semester?: 1 | 2;
    generatedAt: string;
    companyName: string;
    hideSalaries: boolean;
    branding: ReportBranding;
  };
  kpis: ReportKpi[];
  stats: GlobalDashboardStats;
  /** Mois inclus dans la période (libellés courts Jan…Déc) */
  monthsInScope: string[];
  /** Index 0–11 des mois inclus */
  monthIndexesInScope: number[];
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  mensuel: "Rapport mensuel RH",
  semestriel: "Rapport semestriel RH",
  annuel: "Rapport annuel RH",
  complet: "Rapport RH complet",
};
