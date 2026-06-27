import type { ReportPeriod, ReportType } from "./types";

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

const MONTH_SHORT = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
] as const;

export function parseReportPeriod(
  type: ReportType,
  params: { year?: string | number; month?: string | number; semester?: string | number }
): ReportPeriod {
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const period: ReportPeriod = { type, year };

  if (type === "mensuel") {
    const m = Number(params.month);
    period.month = m >= 1 && m <= 12 ? m : now.getMonth() + 1;
  }
  if (type === "semestriel") {
    const s = Number(params.semester);
    period.semester = s === 2 ? 2 : 1;
  }
  return period;
}

export function monthIndexesForPeriod(period: ReportPeriod): number[] {
  if (period.type === "mensuel" && period.month) {
    return [period.month - 1];
  }
  if (period.type === "semestriel") {
    return period.semester === 2 ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5];
  }
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
}

export function periodLabel(period: ReportPeriod): string {
  const y = period.year;
  if (period.type === "mensuel" && period.month) {
    return `${MONTH_LABELS[period.month - 1]} ${y}`;
  }
  if (period.type === "semestriel") {
    return period.semester === 2 ? `2e semestre ${y}` : `1er semestre ${y}`;
  }
  if (period.type === "complet") {
    return `Vue complète — ${y}`;
  }
  return `Année ${y}`;
}

export function periodSubtitle(period: ReportPeriod): string {
  switch (period.type) {
    case "mensuel":
      return "Synthèse mensuelle des indicateurs RH, paie, congés et conformité";
    case "semestriel":
      return "Bilan semestriel consolidé pour la direction";
    case "annuel":
      return "Bilan annuel des ressources humaines et masse salariale";
    case "complet":
      return "Rapport intégral avec annexes détaillées (effectifs, paie, dossiers)";
    default:
      return "";
  }
}

export function monthShortLabels(indexes: number[]): string[] {
  return indexes.map((i) => MONTH_SHORT[i] ?? `M${i + 1}`);
}

export function reportFilename(type: ReportType, period: ReportPeriod, ext: string): string {
  const base = `rapport_rh_${type}`;
  if (period.type === "mensuel" && period.month) {
    return `${base}_${period.year}-${String(period.month).padStart(2, "0")}.${ext}`;
  }
  if (period.type === "semestriel") {
    return `${base}_${period.year}_S${period.semester}.${ext}`;
  }
  return `${base}_${period.year}.${ext}`;
}
