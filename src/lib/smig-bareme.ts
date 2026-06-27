import type { SmigBaremeRow } from "./types";

/** Référence barème SMIG — Décret n° 25/22 du 30 mai 2025 (plein taux janvier 2026) */
export const SMIG_BAREME_DATE = "janvier 2026 (Décret n° 25/22 du 30 mai 2025)";
export const SMIG_DAYS_REFERENCE = 26;
export const SMIG_HOUSING_RATE = 0.3;

export function deriveSmigAmounts(
  dailyBaseSalary: number,
  transportDaily: number
): Pick<SmigBaremeRow, "monthlyBase26" | "housingAllowance" | "transportMonthly" | "totalRemuneration"> {
  const monthlyBase26 = Math.round(dailyBaseSalary * SMIG_DAYS_REFERENCE);
  const housingAllowance = Math.round(monthlyBase26 * SMIG_HOUSING_RATE);
  const transportMonthly = Math.round(transportDaily * SMIG_DAYS_REFERENCE);
  const totalRemuneration = monthlyBase26 + housingAllowance + transportMonthly;
  return { monthlyBase26, housingAllowance, transportMonthly, totalRemuneration };
}

/** Transport mensuel de référence (26 j.) → journalier */
export function smigTransportDailyFromMonthly(transportMonthly: number): number {
  return transportMonthly / SMIG_DAYS_REFERENCE;
}

/** Transport mensuel pointage = transport journalier × jours prestés */
export function smigTransportMonthlyFromPointage(
  transportDaily: number,
  daysPresent: number
): number {
  return Math.round(transportDaily * daysPresent);
}

/** @deprecated Utiliser transportDaily du barème */
export function smigTransportDaily(transportMonthly: number): number {
  return smigTransportDailyFromMonthly(transportMonthly);
}

/** Transport journalier barème — colonne « Transport » du SMIG (FC / jour) */
export const TRANSPORT_DAILY_LOW = 4000;
export const TRANSPORT_DAILY_HIGH = 6000;

/** Barème SMIG officiel 2026 — catégories, grades, transport (FC) */
export const DEFAULT_SMIG_BAREME: SmigBaremeRow[] = [
  row("1", "1 Manœuvre (ML)", "ML", "Ordinaire", 1, 100, 21500, TRANSPORT_DAILY_LOW),
  row("2", "1 Manœuvre (ML)", "ML", "Lourd", 2, 116, 24940, TRANSPORT_DAILY_LOW),
  row("3", "2 Travailleurs Spécialisé (TS)", "TS", "—", 3, 133, 28595, TRANSPORT_DAILY_LOW),
  row("4", "3 Travailleurs Semi Qualifié (TSQ)", "TSQ", "1", 4, 154, 33110, TRANSPORT_DAILY_LOW),
  row("5", "3 Travailleurs Semi Qualifié (TSQ)", "TSQ", "2", 5, 178, 38270, TRANSPORT_DAILY_LOW),
  row("6", "3 Travailleurs Semi Qualifié (TSQ)", "TSQ", "3", 6, 206, 44290, TRANSPORT_DAILY_LOW),
  row("7", "4 Travailleurs Qualifié (TQ)", "TQ", "1", 7, 237, 50955, TRANSPORT_DAILY_LOW),
  row("8", "4 Travailleurs Qualifié (TQ)", "TQ", "2", 8, 274, 58910, TRANSPORT_DAILY_HIGH),
  row("9", "5 Travailleurs Hautement Qualifié (THQ)", "THQ", "—", 9, 317, 68155, TRANSPORT_DAILY_HIGH),
  row("10", "6 Maîtrise (M)", "M", "1", 10, 366, 78690, TRANSPORT_DAILY_HIGH),
  row("11", "6 Maîtrise (M)", "M", "2", 11, 422, 90730, TRANSPORT_DAILY_HIGH),
  row("12", "6 Maîtrise (M)", "M", "3", 12, 488, 104920, TRANSPORT_DAILY_HIGH),
  row("13", "6 Maîtrise (M)", "M", "4", 13, 564, 121290, TRANSPORT_DAILY_HIGH),
  row("14", "7 Cadre de Collaboration (C)", "C", "1", 14, 651, 139965, TRANSPORT_DAILY_HIGH),
  row("15", "7 Cadre de Collaboration (C)", "C", "2", 15, 752, 161680, TRANSPORT_DAILY_HIGH),
  row("16", "7 Cadre de Collaboration (C)", "C", "3", 16, 882, 189620, TRANSPORT_DAILY_HIGH),
  row("17", "7 Cadre de Collaboration (C)", "C", "4", 17, 1000, 215000, TRANSPORT_DAILY_HIGH),
];

function row(
  id: string,
  categoryLabel: string,
  categoryCode: string,
  echelon: string,
  grade: number,
  tension: number,
  dailyBaseSalary: number,
  transportDaily: number
): SmigBaremeRow {
  const derived = deriveSmigAmounts(dailyBaseSalary, transportDaily);
  return {
    id,
    categoryLabel,
    categoryCode,
    echelon,
    grade,
    tension,
    dailyBaseSalary,
    transportDaily,
    ...derived,
  };
}

/**
 * Corrige les lignes créées quand 4 000 / 6 000 étaient traités comme mensuels (÷ 26).
 * Le barème officiel indique le transport journalier (4 000 ou 6 000 FC/jour).
 */
export function normalizeSmigRow(row: SmigBaremeRow): SmigBaremeRow {
  let transportDaily = row.transportDaily;

  const looksLikeOldMonthlySplit =
    row.transportMonthly > 0 &&
    row.transportMonthly <= TRANSPORT_DAILY_HIGH + 1 &&
    transportDaily > 0 &&
    transportDaily < row.transportMonthly * 0.9;

  if (looksLikeOldMonthlySplit) {
    transportDaily = row.transportMonthly;
  } else if (transportDaily <= 0 && row.transportMonthly > 0) {
    if (row.transportMonthly <= TRANSPORT_DAILY_HIGH + 1) {
      transportDaily = row.transportMonthly;
    } else {
      transportDaily = smigTransportDailyFromMonthly(row.transportMonthly);
    }
  } else if (transportDaily > 0 && transportDaily < 500 && row.transportMonthly > 10000) {
    transportDaily = smigTransportDailyFromMonthly(row.transportMonthly);
  }

  if (transportDaily <= 0) {
    transportDaily = row.grade <= 7 ? TRANSPORT_DAILY_LOW : TRANSPORT_DAILY_HIGH;
  }

  return refreshSmigRow({ ...row, transportDaily });
}

export function refreshSmigRow(row: SmigBaremeRow): SmigBaremeRow {
  return { ...row, ...deriveSmigAmounts(row.dailyBaseSalary, row.transportDaily) };
}

export function getSmigRowByGrade(
  bareme: SmigBaremeRow[],
  grade: number
): SmigBaremeRow | undefined {
  const found = bareme.find((r) => r.grade === grade);
  return found ? normalizeSmigRow(found) : undefined;
}

export function listSmigCategories(bareme: SmigBaremeRow[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of bareme) {
    if (!seen.has(r.categoryLabel)) {
      seen.add(r.categoryLabel);
      out.push(r.categoryLabel);
    }
  }
  return out;
}

export function filterSmigByCategory(
  bareme: SmigBaremeRow[],
  categoryLabel: string
): SmigBaremeRow[] {
  return bareme.filter((r) => r.categoryLabel === categoryLabel);
}

/** Logement mensuel barème plein mois : (base journalier × 26) × 30 % */
export function smigHousingMonthly(dailyBaseSalary: number): number {
  return Math.round(dailyBaseSalary * SMIG_DAYS_REFERENCE * SMIG_HOUSING_RATE);
}

/** Logement mensuel pointage : base journalier × jours prestés (P) × 30 % */
export function smigHousingMonthlyFromPointage(
  dailyBaseSalary: number,
  daysPresent: number
): number {
  return Math.round(dailyBaseSalary * daysPresent * SMIG_HOUSING_RATE);
}
