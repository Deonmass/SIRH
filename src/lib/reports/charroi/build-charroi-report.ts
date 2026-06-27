import {
  courseKmParcours,
  formatEntretienTypes,
  formatKm,
} from "@/lib/charroi-entretien";
import { filterHistoriqueByPeriod } from "@/lib/charroi-entretien-period";
import type { CharroiVehiculeStatut } from "@/lib/repositories/charroi/charroi.repository";
import type { CourseVehicule } from "@/lib/repositories/courses-vehicule";
import type { Vehicule } from "@/lib/repositories/vehicules";
import type { EntretienSuiviRow } from "@/lib/charroi-entretien";
import type { ReportKpi, ReportPeriod } from "../types";
import type { resolveReportBranding } from "../pdf-branding";
import {
  CHARROI_REPORT_TYPE_LABELS,
  type CharroiReportData,
  type CharroiReportType,
  type CountRow,
} from "./types";
import {
  charroiPeriodSubtitle,
  dateRangeForCharroiPeriod,
  periodLabel,
} from "./period";

const STATUT_VEHICULE_LABELS: Record<CharroiVehiculeStatut, string> = {
  disponible: "Disponible",
  affecte: "Affecté",
  en_course: "En course",
  maintenance: "En maintenance",
};

const STATUT_COURSE_LABELS: Record<CourseVehicule["statut"], string> = {
  demande: "Demande",
  affecte: "Affectée",
  en_cours: "En cours",
  terminee: "Terminée",
};

function inRange(date: string, from: string, to: string): boolean {
  const d = date.slice(0, 10);
  if (!d) return false;
  return d >= from && d <= to;
}

function countBy<T>(items: T[], keyFn: (item: T) => string): CountRow[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item).trim() || "Non renseigné";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));
}

export interface CharroiRawData {
  vehicules: Array<{
    id: string;
    immatriculation: string;
    marque: string;
    type: string;
    statut: CharroiVehiculeStatut;
    kmActuel?: number;
  }>;
  courses: CourseVehicule[];
  entretienItems: EntretienSuiviRow[];
  vehiculesRaw: Vehicule[];
}

export function buildCharroiReport(
  raw: CharroiRawData,
  period: ReportPeriod,
  options: {
    companyName: string;
    branding: Awaited<ReturnType<typeof resolveReportBranding>>;
  }
): CharroiReportData {
  const type = period.type as CharroiReportType;
  const range = dateRangeForCharroiPeriod(period);
  const coursesPeriode = raw.courses.filter((c) =>
    inRange(c.dateDemande, range.from, range.to)
  );

  const parStatut = countBy(raw.vehicules, (v) => STATUT_VEHICULE_LABELS[v.statut]);
  const parMarque = countBy(raw.vehicules, (v) => v.marque);
  const parType = countBy(raw.vehicules, (v) => v.type);

  const disponibles = raw.vehicules
    .filter((v) => v.statut === "disponible")
    .map((v) => ({
      immatriculation: v.immatriculation,
      marque: v.marque,
      type: v.type,
      statut: STATUT_VEHICULE_LABELS[v.statut],
      kmActuel: v.kmActuel,
    }));

  const listeVehicules = raw.vehicules.map((v) => ({
    immatriculation: v.immatriculation,
    marque: v.marque,
    type: v.type,
    statut: STATUT_VEHICULE_LABELS[v.statut],
    kmActuel: v.kmActuel,
  }));

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
    vehiculeId: string;
    immatriculation: string;
    marque: string;
    type: string;
    description: string;
    date: string;
    eventType: "panne" | "remise_service";
  }> = [];

  for (const v of raw.vehiculesRaw) {
    for (const ev of v.pannes) {
      if (!inRange(ev.at, range.from, range.to)) continue;
      panneEvents.push({
        vehiculeId: v.id,
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

  const vehiculesEnPanne = raw.vehicules.filter((v) => v.statut === "maintenance").length;
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

  const enRetard = raw.entretienItems.filter((r) => r.alertLevel === "overdue").length;
  const aPlanifier = raw.entretienItems.filter((r) => r.alertLevel === "warning").length;
  const aJour = raw.entretienItems.filter((r) => r.alertLevel === "ok").length;

  const historiqueRows: CharroiReportData["entretien"]["historique"] = [];
  for (const row of raw.entretienItems) {
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

  const alertes = raw.entretienItems
    .filter((r) => r.alertLevel === "overdue" || r.alertLevel === "warning")
    .map((r) => ({
      immatriculation: r.plaque,
      marque: r.marque,
      type: r.vehicleType?.trim() || "—",
      alerte: r.alertLabel,
      kmActuel: r.kmActuel,
      prochainKm: r.prochainEntretienKm,
      dernierEntretien: r.dernierEntretienDate?.slice(0, 10),
      nbEntretiensPeriode: filterHistoriqueByPeriod(r.historique, range).length,
    }));

  const kpis: ReportKpi[] = [
    {
      id: "vehicules",
      label: "Véhicules au parc",
      value: String(raw.vehicules.length),
      hint: `${disponibles.length} disponibles`,
      tone: "sky",
    },
    {
      id: "courses",
      label: "Courses (période)",
      value: String(coursesPeriode.length),
      hint: `${coursesPeriode.filter((c) => c.statut === "demande").length} demandes en attente`,
      tone: "violet",
    },
    {
      id: "km",
      label: "Km parcourus",
      value: formatKm(kmParcours),
      hint: `${range.from} → ${range.to}`,
      tone: "emerald",
    },
    {
      id: "pannes",
      label: "Véhicules en panne",
      value: String(vehiculesEnPanne),
      hint: `${panneEvents.filter((e) => e.eventType === "panne").length} déclarations sur la période`,
      tone: "amber",
    },
    {
      id: "entretien-retard",
      label: "Entretien en retard",
      value: String(enRetard),
      hint: `${aPlanifier} à planifier`,
      tone: "rose",
    },
    {
      id: "entretien-periode",
      label: "Entretiens réalisés",
      value: String(historiqueRows.length),
      hint: "Historique sur la période",
      tone: "slate",
    },
  ];

  return {
    meta: {
      type,
      title: CHARROI_REPORT_TYPE_LABELS[type],
      subtitle: charroiPeriodSubtitle(type),
      periodLabel: periodLabel(period),
      year: period.year,
      month: period.month,
      semester: period.semester,
      generatedAt: new Date().toISOString(),
      companyName: options.companyName,
      branding: options.branding,
      dateFrom: range.from,
      dateTo: range.to,
    },
    kpis,
    parc: {
      total: raw.vehicules.length,
      parStatut,
      parMarque,
      parType,
      disponibles,
      liste: listeVehicules,
    },
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
      vehiculesEnPanne,
      remisesService,
      parVehicule: panneParVehicule,
      liste: listePannes,
    },
    entretien: {
      enRetard,
      aPlanifier,
      aJour,
      historiquePeriode: historiqueRows.length,
      kmParcoursPeriode: kmParcours,
      alertes,
      historique: historiqueRows,
    },
    period,
  };
}
