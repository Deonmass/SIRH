import type { EntretienHistoriqueEntry, EntretienSuiviRow } from "@/lib/charroi-entretien";

export type EntretienPeriodMode =
  | "all"
  | "year"
  | "month"
  | "quarter"
  | "semester"
  | "interval";

export interface EntretienPeriodFilters {
  mode: EntretienPeriodMode;
  year: number;
  month: number | "";
  quarter: 1 | 2 | 3 | 4;
  semester: 1 | 2;
  dateFrom: string;
  dateTo: string;
}

export function defaultEntretienPeriodFilters(now = new Date()): EntretienPeriodFilters {
  return {
    mode: "all",
    year: now.getFullYear(),
    month: "",
    quarter: 1,
    semester: 1,
    dateFrom: "",
    dateTo: "",
  };
}

function padDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function inDateRange(date: string, from?: string, to?: string): boolean {
  const d = date.slice(0, 10);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export function resolveEntretienDateRange(
  filters: EntretienPeriodFilters
): { from?: string; to?: string } | null {
  if (filters.mode === "all") return null;

  if (filters.mode === "interval") {
    return {
      from: filters.dateFrom || undefined,
      to: filters.dateTo || undefined,
    };
  }

  const y = filters.year;

  if (filters.mode === "month" && filters.month !== "") {
    const endDay = new Date(y, filters.month, 0).getDate();
    return {
      from: padDate(y, filters.month, 1),
      to: padDate(y, filters.month, endDay),
    };
  }

  if (filters.mode === "quarter") {
    const startMonth = (filters.quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const endDay = new Date(y, endMonth, 0).getDate();
    return {
      from: padDate(y, startMonth, 1),
      to: padDate(y, endMonth, endDay),
    };
  }

  if (filters.mode === "semester") {
    if (filters.semester === 1) {
      return { from: padDate(y, 1, 1), to: padDate(y, 6, 30) };
    }
    return { from: padDate(y, 7, 1), to: padDate(y, 12, 31) };
  }

  return { from: padDate(y, 1, 1), to: padDate(y, 12, 31) };
}

export function entretienPeriodLabel(filters: EntretienPeriodFilters): string {
  if (filters.mode === "all") return "Toutes périodes";
  const range = resolveEntretienDateRange(filters);
  if (!range?.from && !range?.to) return "Période personnalisée";

  if (filters.mode === "month" && filters.month !== "") {
    const labels = [
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
    ];
    return `${labels[filters.month - 1]} ${filters.year}`;
  }
  if (filters.mode === "quarter") {
    return `T${filters.quarter} ${filters.year}`;
  }
  if (filters.mode === "semester") {
    return filters.semester === 1 ? `S1 ${filters.year}` : `S2 ${filters.year}`;
  }
  if (filters.mode === "interval" && range.from && range.to) {
    return `${range.from} → ${range.to}`;
  }
  if (filters.mode === "year") {
    return `Année ${filters.year}`;
  }
  return range.from && range.to ? `${range.from} → ${range.to}` : "Période";
}

function historiqueDates(row: EntretienSuiviRow): string[] {
  const dates = row.historique
    .map((h) => h.date.slice(0, 10))
    .filter((d) => d.length >= 10);
  if (row.dernierEntretienDate) {
    dates.push(row.dernierEntretienDate.slice(0, 10));
  }
  return [...new Set(dates)];
}

export function rowMatchesEntretienPeriod(
  row: EntretienSuiviRow,
  range: { from?: string; to?: string } | null
): boolean {
  if (!range) return true;
  const dates = historiqueDates(row);
  if (dates.length === 0) return false;
  return dates.some((d) => inDateRange(d, range.from, range.to));
}

export function filterHistoriqueByPeriod(
  historique: EntretienHistoriqueEntry[],
  range: { from?: string; to?: string } | null
): EntretienHistoriqueEntry[] {
  if (!range) return historique;
  return historique.filter((h) => inDateRange(h.date, range.from, range.to));
}
