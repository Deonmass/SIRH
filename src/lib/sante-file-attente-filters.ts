import type { HopitalVisite } from "@/lib/repositories/hopital-visite";
import type { Employee } from "@/lib/types";
import { employeeDisplayName } from "@/lib/extra-costs";
import { getSanteVisiteStatut } from "@/lib/sante-visite";

export type SanteAdvancedPeriodMode = "interval" | "week" | "quarter" | "semester";

export interface SanteFileAttenteBasicFilters {
  search: string;
  year: number;
  month: number | "";
}

export interface SanteFileAttenteAdvancedFilters {
  active: boolean;
  mode: SanteAdvancedPeriodMode;
  dateFrom: string;
  dateTo: string;
  weekYear: number;
  week: number;
  quarterYear: number;
  quarter: 1 | 2 | 3 | 4;
  semesterYear: number;
  semester: 1 | 2;
}

function padDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function isoWeekStart(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - day + 1);
  const start = new Date(mondayWeek1);
  start.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  return start;
}

export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function resolveSanteDateRange(
  basic: SanteFileAttenteBasicFilters,
  advanced: SanteFileAttenteAdvancedFilters
): { from?: string; to?: string } {
  if (advanced.active) {
    if (advanced.mode === "interval") {
      return {
        from: advanced.dateFrom || undefined,
        to: advanced.dateTo || undefined,
      };
    }
    if (advanced.mode === "week") {
      const start = isoWeekStart(advanced.weekYear, advanced.week);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      return {
        from: padDate(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()),
        to: padDate(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate()),
      };
    }
    if (advanced.mode === "quarter") {
      const startMonth = (advanced.quarter - 1) * 3 + 1;
      const endMonth = startMonth + 2;
      const endDay = new Date(advanced.quarterYear, endMonth, 0).getDate();
      return {
        from: padDate(advanced.quarterYear, startMonth, 1),
        to: padDate(advanced.quarterYear, endMonth, endDay),
      };
    }
    if (advanced.mode === "semester") {
      if (advanced.semester === 1) {
        return {
          from: padDate(advanced.semesterYear, 1, 1),
          to: padDate(advanced.semesterYear, 6, 30),
        };
      }
      return {
        from: padDate(advanced.semesterYear, 7, 1),
        to: padDate(advanced.semesterYear, 12, 31),
      };
    }
  }

  if (basic.month !== "") {
    const endDay = new Date(basic.year, basic.month, 0).getDate();
    return {
      from: padDate(basic.year, basic.month, 1),
      to: padDate(basic.year, basic.month, endDay),
    };
  }

  return {
    from: padDate(basic.year, 1, 1),
    to: padDate(basic.year, 12, 31),
  };
}

function inDateRange(dateVisite: string | undefined, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const d = dateVisite ?? "";
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function matchesSearch(
  row: HopitalVisite,
  query: string,
  employeeByMatricule: Map<string, Employee>
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const emp = row.matriculeAgent
    ? employeeByMatricule.get(row.matriculeAgent)
    : undefined;
  const haystack = [
    row.matriculeAgent,
    emp ? employeeDisplayName(emp) : "",
    emp?.nom,
    emp?.prenom,
    row.hopital,
    row.motif,
    getSanteVisiteStatut(row.validation),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return needle.split(/\s+/).every((t) => haystack.includes(t));
}

export function filterSanteFileAttenteRows(
  rows: HopitalVisite[],
  basic: SanteFileAttenteBasicFilters,
  advanced: SanteFileAttenteAdvancedFilters,
  employeeByMatricule: Map<string, Employee>
): HopitalVisite[] {
  const range = resolveSanteDateRange(basic, advanced);
  return rows.filter((row) => {
    if (!inDateRange(row.dateVisite, range.from, range.to)) return false;
    return matchesSearch(row, basic.search, employeeByMatricule);
  });
}
