import type {
  DbPointageJourJson,
  DbPointageJourStatut,
  DbPointagePayloadJson,
  DbPointageSyntheseJson,
} from "../../database/migrations/019_pointage_table.types";
import type { PointageRecord, PointageSynthese, WorkMonthMode } from "@/lib/types";

export const POINTAGE_JOUR_STATUTS: {
  value: DbPointageJourStatut;
  label: string;
  short: string;
  color: string;
}[] = [
  { value: "present", label: "Présent", short: "P", color: "bg-emerald-500/20 text-emerald-500" },
  { value: "retard", label: "Retard", short: "R", color: "bg-amber-500/20 text-amber-500" },
  { value: "maladie", label: "Maladie", short: "M", color: "bg-orange-500/20 text-orange-500" },
  { value: "conge", label: "Congé", short: "C", color: "bg-cyan-500/20 text-cyan-500" },
  { value: "ferie", label: "Férié", short: "F", color: "bg-violet-500/20 text-violet-500" },
  { value: "mission", label: "Mission", short: "Mi", color: "bg-sky-500/20 text-sky-500" },
  { value: "repos", label: "Repos", short: "Re", color: "bg-slate-500/20 text-slate-400" },
  {
    value: "absent_justifie",
    label: "Absence justifiée",
    short: "AJ",
    color: "bg-blue-500/20 text-blue-400",
  },
  {
    value: "absent_non_justifie",
    label: "Absence non justifiée",
    short: "AN",
    color: "bg-red-500/20 text-red-400",
  },
];

export const EMPTY_POINTAGE_SYNTHESE: DbPointageSyntheseJson = {
  jours_presents: 0,
  jours_maladie: 0,
  jours_conge: 0,
  jours_feries: 0,
  jours_mission: 0,
  jours_repos: 0,
  absences_justifiees: 0,
  absences_non_justifiees: 0,
  retards: 0,
  minutes_retard_total: 0,
  heures_sup_total: 0,
  jours_prestes_paie: 0,
  jours_maladie_paie: 0,
  jours_conge_paie: 0,
  jours_feries_paie: 0,
};

export const EMPTY_POINTAGE_PAYLOAD: DbPointagePayloadJson = {
  jours: [],
  synthese: { ...EMPTY_POINTAGE_SYNTHESE },
  verrouille: false,
};

export function pointageIdToApp(id: number): string {
  return String(id);
}

export function pointageIdFromApp(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Identifiant pointage invalide : ${id}`);
  return n;
}

export function parsePointagePayload(raw: string | null | undefined): DbPointagePayloadJson {
  if (!raw?.trim()) return { ...EMPTY_POINTAGE_PAYLOAD, synthese: { ...EMPTY_POINTAGE_SYNTHESE } };
  try {
    const data = JSON.parse(raw) as Partial<DbPointagePayloadJson>;
    return {
      jours: Array.isArray(data.jours) ? data.jours : [],
      synthese: { ...EMPTY_POINTAGE_SYNTHESE, ...(data.synthese ?? {}) },
      verrouille: data.verrouille ?? false,
      commentaire_mois: data.commentaire_mois ?? null,
      modif_le: data.modif_le,
    };
  } catch {
    return { ...EMPTY_POINTAGE_PAYLOAD, synthese: { ...EMPTY_POINTAGE_SYNTHESE } };
  }
}

export function encodePointagePayload(payload: DbPointagePayloadJson): string {
  return JSON.stringify({
    ...payload,
    modif_le: new Date().toISOString(),
  });
}

export function statutLabel(statut: DbPointageJourStatut): string {
  return POINTAGE_JOUR_STATUTS.find((s) => s.value === statut)?.label ?? statut;
}

export function statutBadgeClass(statut: DbPointageJourStatut): string {
  return POINTAGE_JOUR_STATUTS.find((s) => s.value === statut)?.color ?? "bg-slate-500/20 text-slate-400";
}

export function computePointageSynthese(jours: DbPointageJourJson[]): DbPointageSyntheseJson {
  const s = { ...EMPTY_POINTAGE_SYNTHESE };
  for (const j of jours) {
    switch (j.statut) {
      case "present":
        s.jours_presents += 1;
        break;
      case "retard":
        s.jours_presents += 1;
        s.retards += 1;
        s.minutes_retard_total += j.minutes_retard ?? 0;
        break;
      case "maladie":
        s.jours_maladie += 1;
        break;
      case "conge":
        s.jours_conge += 1;
        break;
      case "ferie":
        s.jours_feries += 1;
        break;
      case "mission":
        s.jours_mission += 1;
        break;
      case "repos":
        s.jours_repos += 1;
        break;
      case "absent_justifie":
        s.absences_justifiees += 1;
        break;
      case "absent_non_justifie":
        s.absences_non_justifiees += 1;
        break;
    }
    s.heures_sup_total += j.heures_sup ?? 0;
  }

  s.jours_prestes_paie = s.jours_presents;
  s.jours_maladie_paie = s.jours_maladie;
  s.jours_conge_paie = s.jours_conge;
  s.jours_feries_paie = s.jours_feries;
  return s;
}

/**
 * Jours « Présent » pour la paie : base mensuelle (22 ou 26) moins les statuts explicitement
 * décomptés (maladie, congé, férié, absences). Les jours ouvrés non saisis restent payés au titre P.
 */
export function computeJoursPrestesPaie(
  s: DbPointageSyntheseJson,
  workMonthMode: WorkMonthMode
): number {
  const deducted =
    s.jours_maladie +
    s.jours_conge +
    s.jours_feries +
    s.absences_non_justifiees +
    s.absences_justifiees +
    s.jours_mission;
  return Math.max(0, Math.min(workMonthMode, workMonthMode - deducted));
}

/** Applique la base paie (22/26 j.) sur la synthèse opérationnelle. */
export function applyPayrollDaysToSynthese(
  synthese: DbPointageSyntheseJson,
  workMonthMode: WorkMonthMode
): DbPointageSyntheseJson {
  return {
    ...synthese,
    jours_prestes_paie: computeJoursPrestesPaie(synthese, workMonthMode),
    jours_maladie_paie: synthese.jours_maladie,
    jours_conge_paie: synthese.jours_conge,
    jours_feries_paie: synthese.jours_feries,
  };
}

export function finalizePointageSynthese(
  jours: DbPointageJourJson[],
  workMonthMode: WorkMonthMode
): DbPointageSyntheseJson {
  return applyPayrollDaysToSynthese(computePointageSynthese(jours), workMonthMode);
}

export function applyPayrollSyntheseToRecord(
  record: PointageRecord,
  workMonthMode: WorkMonthMode
): PointageRecord {
  const synthese = finalizePointageSynthese(record.jours as DbPointageJourJson[], workMonthMode);
  return { ...record, synthese: syntheseToApp(synthese) };
}

/** Total jours comptabilisés pour la paie (P + M + C + F). */
export function totalJoursOuvrablesPaie(s: DbPointageSyntheseJson): number {
  return (
    s.jours_prestes_paie + s.jours_maladie_paie + s.jours_conge_paie + s.jours_feries_paie
  );
}

/** Regroupe les statuts journaliers en 5 catégés affichables. */
export function groupPointageForPaieDisplay(s: DbPointageSyntheseJson): {
  present: number;
  maladie: number;
  conge: number;
  ferie: number;
  absence: number;
} {
  return {
    present: s.jours_presents + s.jours_mission,
    maladie: s.jours_maladie,
    conge: s.jours_conge,
    ferie: s.jours_feries,
    absence: s.absences_justifiees + s.absences_non_justifiees,
  };
}

/** Libellé colonne « Jours paie » : 5 catégories + total ouvrable. */
export function formatPaieDaysCell(s: DbPointageSyntheseJson): string {
  const g = groupPointageForPaieDisplay(s);
  const parts = (
    [
      ["P", g.present],
      ["M", g.maladie],
      ["C", g.conge],
      ["F", g.ferie],
      ["Abs", g.absence],
    ] as const
  )
    .filter(([, n]) => n > 0)
    .map(([short, n]) => `${short} ${n}`);

  const total = totalJoursOuvrablesPaie(s);
  if (parts.length === 0) return `— · ${total} j`;
  return `${parts.join(" · ")} — ${total} j`;
}

export function syntheseToApp(row: DbPointageSyntheseJson): PointageSynthese {
  return { ...row };
}

export function rowToPointageRecord(row: {
  id: number;
  matricul_employe: string;
  mois_annee: string;
  pointage: string | null;
  cree_le?: string;
  modif_le?: string;
}): PointageRecord {
  const payload = parsePointagePayload(row.pointage);
  const synthese = computePointageSynthese(payload.jours);
  return {
    id: pointageIdToApp(row.id),
    matriculeEmploye: row.matricul_employe,
    moisAnnee: row.mois_annee,
    jours: payload.jours,
    synthese: syntheseToApp(synthese),
    verrouille: payload.verrouille ?? false,
    commentaireMois: payload.commentaire_mois ?? undefined,
    createdAt: row.cree_le,
    updatedAt: row.modif_le,
  };
}

export function buildMonthDays(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    days.push(formatLocalIsoDate(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function formatLocalIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Fuseau métier pointage (RDC). */
export const POINTAGE_TIMEZONE = "Africa/Kinshasa";

function formatIsoDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/** Date du jour (fuseau RDC) au format ISO YYYY-MM-DD. */
export function todayIsoDate(asOf: Date = new Date(), timeZone = POINTAGE_TIMEZONE): string {
  return formatIsoDateInTimeZone(asOf, timeZone);
}

/** Jour strictement postérieur à aujourd'hui — non saisissable. */
export function isFuturePointageDate(
  date: string,
  asOf: Date = new Date(),
  timeZone = POINTAGE_TIMEZONE
): boolean {
  return date > todayIsoDate(asOf, timeZone);
}

export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

/** 0 = lundi … 6 = dimanche */
export function weekdayIndex(iso: string): number {
  const d = new Date(iso + "T12:00:00").getDay();
  return d === 0 ? 6 : d - 1;
}

export const WEEKDAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"] as const;

export function isWeekendDate(iso: string): boolean {
  return weekdayIndex(iso) >= 5;
}

export function weekendHeaderClass(iso: string): string {
  const wi = weekdayIndex(iso);
  if (wi === 5) return "bg-amber-950/55 text-amber-300";
  if (wi === 6) return "bg-indigo-950/55 text-indigo-300";
  return "";
}

export function weekendCellClass(iso: string): string {
  const wi = weekdayIndex(iso);
  if (wi === 5) return "bg-amber-950/35";
  if (wi === 6) return "bg-indigo-950/40";
  return "";
}

export const MOIS_FR_OPTIONS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
] as const;

export function pointageYearOptions(asOf = new Date()): number[] {
  const y = asOf.getFullYear();
  return [y - 2, y - 1, y, y + 1];
}

export interface PointageSemaineOption {
  value: string;
  label: string;
  dates: string[];
}

export function getPointageSemaineOptions(moisAnnee: string): PointageSemaineOption[] {
  const { year, month } = parseMoisAnnee(moisAnnee);
  const allDays = buildMonthDays(year, month);
  const weeks: string[][] = [];
  let current: string[] = [];

  for (const date of allDays) {
    const wi = weekdayIndex(date);
    if (current.length > 0 && wi === 0) {
      weeks.push(current);
      current = [];
    }
    current.push(date);
  }
  if (current.length) weeks.push(current);

  return [
    { value: "all", label: "Tout le mois", dates: allDays },
    ...weeks.map((dates, i) => ({
      value: String(i + 1),
      label: `Semaine ${i + 1} (${dayOfMonth(dates[0])} – ${dayOfMonth(dates[dates.length - 1])})`,
      dates,
    })),
  ];
}

export function getPointageMonthWeeks(moisAnnee: string): PointageSemaineOption[] {
  return getPointageSemaineOptions(moisAnnee).filter((w) => w.value !== "all");
}

export function visiblePointageDays(moisAnnee: string): string[] {
  return visibleMonthDays(moisAnnee);
}

export function moisAnneeFromParts(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMoisAnnee(moisAnnee: string): { year: number; month: number } {
  const [y, m] = moisAnnee.split("-").map(Number);
  return { year: y, month: m };
}

export function moisAnneeLabel(moisAnnee: string): string {
  const { year, month } = parseMoisAnnee(moisAnnee);
  return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export function defaultJourEntry(date: string): DbPointageJourJson {
  const dow = new Date(date + "T12:00:00").getDay();
  const isWeekend = dow === 0 || dow === 6;
  return {
    date,
    statut: isWeekend ? "repos" : "present",
    heure_arrivee: isWeekend ? null : "07:30",
    heure_depart: isWeekend ? null : "16:30",
    minutes_retard: 0,
    heures_sup: 0,
    commentaire: null,
  };
}

export function mergeJoursForMonth(
  moisAnnee: string,
  existing: DbPointageJourJson[],
  asOf: Date = new Date()
): DbPointageJourJson[] {
  const { year, month } = parseMoisAnnee(moisAnnee);
  const monthDays = buildMonthDays(year, month);
  const byDate = new Map(existing.map((j) => [j.date, j]));
  return monthDays
    .filter((date) => !isFuturePointageDate(date, asOf))
    .map((date) => byDate.get(date))
    .filter((j): j is DbPointageJourJson => Boolean(j));
}

export function filterPointageJoursForSave(
  jours: DbPointageJourJson[],
  asOf: Date = new Date()
): DbPointageJourJson[] {
  return jours.filter((j) => !isFuturePointageDate(j.date, asOf));
}

export function preparePointagePayload(
  jours: DbPointageJourJson[],
  opts?: {
    verrouille?: boolean;
    commentaire_mois?: string | null;
    workMonthMode?: WorkMonthMode;
  }
): DbPointagePayloadJson {
  const eligible = filterPointageJoursForSave(jours);
  const workMonthMode = opts?.workMonthMode ?? 26;
  return {
    jours: eligible,
    synthese: finalizePointageSynthese(eligible, workMonthMode),
    verrouille: opts?.verrouille ?? false,
    commentaire_mois: opts?.commentaire_mois ?? null,
  };
}

/** Heure normale de début (usine) */
export const POINTAGE_STANDARD_START = "07:30";
/** Fin de journée standard — au-delà = heures sup. */
export const POINTAGE_STANDARD_END = "16:30";
/** Durée de travail standard en minutes (8 h). */
export const POINTAGE_STANDARD_MINUTES = 8 * 60;
/** Pause standard non travaillée sur la plage 07:30-16:30. */
export const POINTAGE_STANDARD_BREAK_MINUTES = 60;

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Minutes de retard par rapport à l'heure standard de début. */
export function computeMinutesRetard(heureArrivee: string | null | undefined): number {
  if (!heureArrivee) return 0;
  return Math.max(0, timeToMinutes(heureArrivee) - timeToMinutes(POINTAGE_STANDARD_START));
}

/** Heures sup. au-delà de 8 h travaillées ou après 16:30. */
export function computeHeuresSup(
  heureArrivee: string | null | undefined,
  heureDepart: string | null | undefined
): number {
  if (!heureArrivee || !heureDepart) return 0;
  const start = timeToMinutes(heureArrivee);
  const end = timeToMinutes(heureDepart);
  if (end <= start) return 0;
  const standardStart = timeToMinutes(POINTAGE_STANDARD_START);
  const standardEnd = timeToMinutes(POINTAGE_STANDARD_END);
  const hasFullStandardWindow = start <= standardStart && end >= standardEnd;
  const paidWorked = end - start - (hasFullStandardWindow ? POINTAGE_STANDARD_BREAK_MINUTES : 0);
  const overWork = Math.max(0, paidWorked - POINTAGE_STANDARD_MINUTES);
  const overEnd = Math.max(0, end - timeToMinutes(POINTAGE_STANDARD_END));
  const overtimeMinutes = Math.max(overWork, overEnd);
  return Math.round((overtimeMinutes / 60) * 2) / 2;
}

export function applyPointageTimeRules(entry: DbPointageJourJson): DbPointageJourJson {
  const next = { ...entry };
  if (next.statut === "present" || next.statut === "retard") {
    if (next.statut === "retard") {
      next.minutes_retard = computeMinutesRetard(next.heure_arrivee);
    } else {
      next.minutes_retard = 0;
    }
    next.heures_sup = computeHeuresSup(next.heure_arrivee, next.heure_depart);
  } else {
    next.heures_sup = 0;
    next.minutes_retard = 0;
    if (!["mission"].includes(next.statut)) {
      next.heure_arrivee = null;
      next.heure_depart = null;
    }
  }
  return next;
}

/** Tous les jours du mois sélectionné. */
export function visibleMonthDays(moisAnnee: string): string[] {
  const { year, month } = parseMoisAnnee(moisAnnee);
  return buildMonthDays(year, month);
}

export function isPointageCellFilled(jour?: DbPointageJourJson | null): boolean {
  return Boolean(jour);
}

/** Valeurs par défaut du formulaire lors de la première saisie d'un jour vide. */
export function draftJourEntryForNewCell(date: string): DbPointageJourJson {
  return defaultJourEntry(date);
}

export function getPointageStatutShort(statut: DbPointageJourStatut): string {
  return POINTAGE_JOUR_STATUTS.find((s) => s.value === statut)?.short ?? "?";
}

/** Compte les jours par code court (P, R, M, C, …) hors jours futurs. */
export function countPointageByShort(
  jours: DbPointageJourJson[],
  asOf: Date = new Date()
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const jour of jours) {
    if (isFuturePointageDate(jour.date, asOf)) continue;
    const short = getPointageStatutShort(jour.statut);
    counts.set(short, (counts.get(short) ?? 0) + 1);
  }
  return counts;
}

/** Résumé compact pour infobulle : « P 18 · R 2 · C 3 ». */
export function formatPointageResumeShort(
  jours: DbPointageJourJson[],
  asOf: Date = new Date()
): string {
  const counts = countPointageByShort(jours, asOf);
  const order = ["P", "R", "M", "C", "F", "Mi", "Re", "AJ", "AN"] as const;
  const parts = order
    .filter((short) => (counts.get(short) ?? 0) > 0)
    .map((short) => `${short} ${counts.get(short)}`);
  return parts.length > 0 ? parts.join(" · ") : "Aucune saisie";
}

/** Infobulle détaillée au survol du nom employé. */
export function formatPointageResumeTooltip(
  jours: DbPointageJourJson[],
  asOf: Date = new Date()
): string {
  const counts = countPointageByShort(jours, asOf);
  if (counts.size === 0) return "Aucune saisie sur le mois";

  const lines = ["Résumé du mois"];
  for (const statut of POINTAGE_JOUR_STATUTS) {
    const n = counts.get(statut.short);
    if (n) lines.push(`${statut.short} : ${n} — ${statut.label}`);
  }
  const synthese = computePointageSynthese(jours.filter((j) => !isFuturePointageDate(j.date, asOf)));
  if (synthese.heures_sup_total > 0) {
    lines.push(`HS : ${synthese.heures_sup_total} h — Heures supplémentaires`);
  }
  if (synthese.minutes_retard_total > 0) {
    lines.push(`Ret. : ${synthese.minutes_retard_total} min — Retard cumulé`);
  }
  return lines.join("\n");
}
