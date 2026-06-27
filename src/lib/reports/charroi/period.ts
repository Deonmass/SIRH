import { parseReportPeriod, periodLabel } from "../period";
import type { ReportPeriod, ReportType } from "../types";

export function dateRangeForCharroiPeriod(period: ReportPeriod): { from: string; to: string } {
  const y = period.year;
  if (period.type === "mensuel" && period.month) {
    const m = period.month;
    const endDay = new Date(y, m, 0).getDate();
    return {
      from: `${y}-${String(m).padStart(2, "0")}-01`,
      to: `${y}-${String(m).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
    };
  }
  if (period.type === "semestriel") {
    if (period.semester === 2) return { from: `${y}-07-01`, to: `${y}-12-31` };
    return { from: `${y}-01-01`, to: `${y}-06-30` };
  }
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export function charroiPeriodSubtitle(type: ReportType): string {
  switch (type) {
    case "mensuel":
      return "Synthèse mensuelle du parc automobile, courses, pannes et entretien";
    case "semestriel":
      return "Bilan semestriel du charroi : flotte, mobilité et maintenance";
    case "annuel":
      return "Bilan annuel de la gestion du parc et des déplacements";
    case "complet":
      return "Rapport intégral du module Charroi avec détail des opérations";
    default:
      return "";
  }
}

export function charroiReportFilename(
  type: ReportType,
  period: ReportPeriod,
  ext: string
): string {
  const base = `rapport_charroi_${type}`;
  if (period.type === "mensuel" && period.month) {
    return `${base}_${period.year}-${String(period.month).padStart(2, "0")}.${ext}`;
  }
  if (period.type === "semestriel") {
    return `${base}_${period.year}_S${period.semester}.${ext}`;
  }
  return `${base}_${period.year}.${ext}`;
}

export function parseCharroiReportPeriod(
  type: ReportType,
  params: { year?: string | number; month?: string | number; semester?: string | number }
): ReportPeriod {
  return parseReportPeriod(type, params);
}

export { periodLabel };
