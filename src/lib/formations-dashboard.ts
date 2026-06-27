import type { FormationRecord, FormationStatus } from "@/lib/types";
import { formationStatus } from "@/lib/formations-utils";

export type FormationsMonthlyPoint = {
  month: string;
  monthKey: string;
  aVenir: number;
  enCours: number;
  terminees: number;
};

export type FormationsDashboardData = {
  total: number;
  aVenir: number;
  enCours: number;
  terminees: number;
  totalParticipants: number;
  monthlyTrend: FormationsMonthlyPoint[];
  upcoming: FormationRecord[];
};

const MONTH_LABELS = [
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
];

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function overlapsMonth(f: FormationRecord, year: number, month: number): boolean {
  const start = new Date(`${f.dateDebut}T12:00:00`);
  const end = new Date(`${f.dateFin}T12:00:00`);
  const mStart = new Date(year, month, 1);
  const mEnd = new Date(year, month + 1, 0, 23, 59, 59);
  return start <= mEnd && end >= mStart;
}

export function computeFormationsDashboard(
  formations: FormationRecord[],
  year: number
): FormationsDashboardData {
  const counts = { a_venir: 0, en_cours: 0, terminee: 0 } as Record<FormationStatus, number>;
  let totalParticipants = 0;

  for (const f of formations) {
    counts[f.status]++;
    totalParticipants += f.participantCount;
  }

  const monthlyTrend: FormationsMonthlyPoint[] = Array.from({ length: 12 }, (_, m) => {
    const inMonth = formations.filter((f) => overlapsMonth(f, year, m));
    const aVenir = inMonth.filter((f) => formationStatus(f.dateDebut, f.dateFin, new Date(year, m, 15)) === "a_venir").length;
    const enCours = inMonth.filter((f) => formationStatus(f.dateDebut, f.dateFin, new Date(year, m, 15)) === "en_cours").length;
    const terminees = inMonth.filter((f) => formationStatus(f.dateDebut, f.dateFin, new Date(year, m, 15)) === "terminee").length;
    return {
      month: MONTH_LABELS[m]!,
      monthKey: monthKey(year, m),
      aVenir,
      enCours,
      terminees,
    };
  });

  const upcoming = formations
    .filter((f) => f.status === "a_venir")
    .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut))
    .slice(0, 8);

  return {
    total: formations.length,
    aVenir: counts.a_venir,
    enCours: counts.en_cours,
    terminees: counts.terminee,
    totalParticipants,
    monthlyTrend,
    upcoming,
  };
}
