import {
  courseKmParcours,
  formatEntretienTypes,
  type EntretienSuiviRow,
} from "@/lib/charroi-entretien";
import { filterHistoriqueByPeriod } from "@/lib/charroi-entretien-period";
import type { CharroiDashboardPeriodFilter } from "@/lib/repositories/charroi/charroi.repository";
import type { CourseVehicule } from "@/lib/repositories/courses-vehicule";
import type { Vehicule } from "@/lib/repositories/vehicules";

export interface CharroiDashboardCountRow {
  label: string;
  count: number;
}

export interface CharroiDashboardCourseRow {
  date: string;
  demandeur: string;
  chauffeur: string;
  type: string;
  vehicule: string;
  destination: string;
  statut: string;
  kmParcours?: number;
}

export interface CharroiDashboardPanneRow {
  immatriculation: string;
  marque: string;
  type: string;
  description: string;
  date: string;
  enPanne: boolean;
}

export interface CharroiDashboardEntretienAlerteRow {
  immatriculation: string;
  marque: string;
  type: string;
  alerte: string;
  kmActuel?: number;
  prochainKm?: number;
  dernierEntretien?: string;
}

export interface CharroiDashboardEntretienHistoriqueRow {
  immatriculation: string;
  date: string;
  types: string;
  km?: number;
  prestataire: string;
  cout?: number;
}

export interface CharroiDashboardCoursesTab {
  total: number;
  demandes: number;
  affectees: number;
  enCours: number;
  terminees: number;
  kmParcours: number;
  parStatut: CharroiDashboardCountRow[];
  parType: CharroiDashboardCountRow[];
  parChauffeur: CharroiDashboardCountRow[];
  liste: CharroiDashboardCourseRow[];
}

export interface CharroiDashboardPannesTab {
  eventsPeriode: number;
  vehiculesEnPanne: number;
  remisesService: number;
  declarations: number;
  parVehicule: CharroiDashboardCountRow[];
  liste: CharroiDashboardPanneRow[];
}

export interface CharroiDashboardEntretiensTab {
  enRetard: number;
  aPlanifier: number;
  aJour: number;
  historiquePeriode: number;
  alertes: CharroiDashboardEntretienAlerteRow[];
  historique: CharroiDashboardEntretienHistoriqueRow[];
}

export interface CharroiDashboardTabs {
  courses: CharroiDashboardCoursesTab;
  entretiens: CharroiDashboardEntretiensTab;
  pannes: CharroiDashboardPannesTab;
}

const STATUT_COURSE_LABELS: Record<CourseVehicule["statut"], string> = {
  demande: "Demande",
  affecte: "Affectée",
  en_cours: "En cours",
  terminee: "Terminée",
};

function dateRangeForDashboardPeriod(year: number, month?: number): { from: string; to: string } {
  if (month != null && month >= 1 && month <= 12) {
    const endDay = new Date(year, month, 0).getDate();
    const m = String(month).padStart(2, "0");
    return {
      from: `${year}-${m}-01`,
      to: `${year}-${m}-${String(endDay).padStart(2, "0")}`,
    };
  }
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function inRange(date: string, from: string, to: string): boolean {
  const d = date.slice(0, 10);
  if (!d) return false;
  return d >= from && d <= to;
}

function countBy<T>(items: T[], keyFn: (item: T) => string): CharroiDashboardCountRow[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item).trim() || "Non renseigné";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));
}

export function buildCharroiDashboardTabs(input: {
  period: CharroiDashboardPeriodFilter;
  courses: CourseVehicule[];
  entretienItems: EntretienSuiviRow[];
  vehiculesRaw: Vehicule[];
  vehiculesEnPanne: number;
}): CharroiDashboardTabs {
  const range = dateRangeForDashboardPeriod(input.period.year, input.period.month);
  const coursesPeriode = input.courses.filter((c) =>
    inRange(c.dateDemande, range.from, range.to)
  );

  const parStatutCourse = countBy(coursesPeriode, (c) => STATUT_COURSE_LABELS[c.statut]);
  const parTypeCourse = countBy(
    coursesPeriode,
    (c) => c.typeCourseDesignation?.trim() || "Sans type"
  );
  const parChauffeur = countBy(
    coursesPeriode.filter((c) => c.chauffeur?.trim()),
    (c) => c.chauffeur!.trim()
  );

  const kmParcours = coursesPeriode.reduce((sum, c) => {
    if (c.statut !== "terminee" && c.statut !== "en_cours") return sum;
    return sum + (courseKmParcours(c) ?? 0);
  }, 0);

  const listeCourses = coursesPeriode
    .slice()
    .sort((a, b) => b.dateDemande.localeCompare(a.dateDemande))
    .map((c) => ({
      date: c.dateDemande.slice(0, 10),
      demandeur: c.matriculeAgent,
      chauffeur: c.chauffeur?.trim() || "—",
      type: c.typeCourseDesignation?.trim() || "—",
      vehicule: c.vehiculePlaque?.trim() || "—",
      destination: c.destination?.trim() || "—",
      statut: STATUT_COURSE_LABELS[c.statut],
      kmParcours: courseKmParcours(c),
    }));

  const panneEvents: Array<{
    immatriculation: string;
    marque: string;
    type: string;
    description: string;
    date: string;
    eventType: "panne" | "remise_service";
  }> = [];

  for (const v of input.vehiculesRaw) {
    for (const ev of v.pannes) {
      if (!inRange(ev.at, range.from, range.to)) continue;
      panneEvents.push({
        immatriculation: v.plaque?.trim() || `#${v.id}`,
        marque: v.marque?.trim() || "—",
        type: v.vehicleType?.trim() || "—",
        description: ev.description,
        date: ev.at.slice(0, 10),
        eventType: ev.type,
      });
    }
  }

  panneEvents.sort((a, b) => b.date.localeCompare(a.date));

  const declarations = panneEvents.filter((e) => e.eventType === "panne").length;
  const remisesService = panneEvents.filter((e) => e.eventType === "remise_service").length;

  const panneParVehicule = countBy(
    panneEvents.filter((e) => e.eventType === "panne"),
    (e) => e.immatriculation
  );

  const listePannes = panneEvents.map((e) => ({
    immatriculation: e.immatriculation,
    marque: e.marque,
    type: e.type,
    description: e.description,
    date: e.date,
    enPanne: e.eventType === "panne",
  }));

  const enRetard = input.entretienItems.filter((r) => r.alertLevel === "overdue").length;
  const aPlanifier = input.entretienItems.filter((r) => r.alertLevel === "warning").length;
  const aJour = input.entretienItems.filter((r) => r.alertLevel === "ok").length;

  const historiqueRows: CharroiDashboardEntretienHistoriqueRow[] = [];
  for (const row of input.entretienItems) {
    const filtered = filterHistoriqueByPeriod(row.historique, range);
    for (const h of filtered) {
      historiqueRows.push({
        immatriculation: row.plaque,
        date: h.date.slice(0, 10),
        types: formatEntretienTypes(h.types ?? [h.type]),
        km: h.kmOdometre,
        prestataire: h.prestataire?.trim() || "—",
        cout: h.cout,
      });
    }
  }
  historiqueRows.sort((a, b) => b.date.localeCompare(a.date));

  const alertes = input.entretienItems
    .filter((r) => r.alertLevel === "overdue" || r.alertLevel === "warning")
    .map((r) => ({
      immatriculation: r.plaque,
      marque: r.marque,
      type: r.vehicleType?.trim() || "—",
      alerte: r.alertLabel,
      kmActuel: r.kmActuel,
      prochainKm: r.prochainEntretienKm,
      dernierEntretien: r.dernierEntretienDate?.slice(0, 10),
    }));

  return {
    courses: {
      total: coursesPeriode.length,
      demandes: coursesPeriode.filter((c) => c.statut === "demande").length,
      affectees: coursesPeriode.filter((c) => c.statut === "affecte").length,
      enCours: coursesPeriode.filter((c) => c.statut === "en_cours").length,
      terminees: coursesPeriode.filter((c) => c.statut === "terminee").length,
      kmParcours,
      parStatut: parStatutCourse,
      parType: parTypeCourse,
      parChauffeur,
      liste: listeCourses,
    },
    pannes: {
      eventsPeriode: panneEvents.length,
      vehiculesEnPanne: input.vehiculesEnPanne,
      remisesService,
      declarations,
      parVehicule: panneParVehicule,
      liste: listePannes,
    },
    entretiens: {
      enRetard,
      aPlanifier,
      aJour,
      historiquePeriode: historiqueRows.length,
      alertes,
      historique: historiqueRows,
    },
  };
}
