import { listCoursesVehicule } from "@/lib/repositories/courses-vehicule";
import { listTypeCours } from "@/lib/repositories/type-cours";
import {
  getEntretienDashboard,
  listEntretienSuivi,
} from "@/lib/repositories/vehicules/entretien-suivi.repository";
import { listVehicules } from "@/lib/repositories/vehicules";
import { isVehiculeHorsService } from "@/lib/vehicule-pannes";
import { computeKmActuel, kmParcoursPeriode, matchesCoursePeriod } from "@/lib/charroi-entretien";
import { buildCharroiDashboardTabs } from "@/lib/charroi-dashboard-detail";

export type CharroiVehiculeStatut = "disponible" | "affecte" | "en_course" | "maintenance";

export interface CharroiVehicule {
  id: string;
  immatriculation: string;
  marque?: string;
  modele?: string;
  statut: CharroiVehiculeStatut;
  kilometrageInitiale?: number;
  kmActuel?: number;
  createdAt: string;
}

export interface CharroiTypeCourse {
  id: string;
  libelle: string;
  description?: string;
}

/** @deprecated Utiliser CourseVehicule — conservé pour compatibilité planning API */
export interface CharroiCourse {
  id: string;
  typeCourseId?: string;
  vehiculeId?: string;
  demandeur: string;
  destination?: string;
  motif?: string;
  statut: "demande" | "en_cours" | "terminee" | "annulee";
  chauffeurNom?: string;
  dateDemande: string;
  typeCourseLibelle?: string;
  vehiculeImmatriculation?: string;
}

export async function listCharroiVehicules(): Promise<CharroiVehicule[]> {
  const [vehicules, courses] = await Promise.all([listVehicules(), listCoursesVehicule()]);
  const courseStatutByVehicule = new Map<string, "affecte" | "en_cours">();
  for (const course of courses) {
    if (!course.vehiculeId) continue;
    if (course.statut === "en_cours") {
      courseStatutByVehicule.set(course.vehiculeId, "en_cours");
    } else if (course.statut === "affecte" && !courseStatutByVehicule.has(course.vehiculeId)) {
      courseStatutByVehicule.set(course.vehiculeId, "affecte");
    }
  }

  return vehicules.map((v) => {
    let statut: CharroiVehiculeStatut = "disponible";
    if (isVehiculeHorsService(v.pannes)) {
      statut = "maintenance";
    } else {
      const courseStatut = courseStatutByVehicule.get(v.id);
      if (courseStatut === "en_cours") statut = "en_course";
      else if (courseStatut === "affecte") statut = "affecte";
    }
    const vehiculeCourses = courses.filter((c) => c.vehiculeId === v.id);
    const kmActuel = computeKmActuel(v.kilometrageInitiale, vehiculeCourses);
    return {
      id: v.id,
      immatriculation: v.plaque ?? `Véhicule #${v.id}`,
      marque: v.marque,
      modele: v.vehicleType,
      statut,
      kilometrageInitiale: v.kilometrageInitiale,
      kmActuel,
      createdAt: v.createdAt,
    };
  });
}

export async function listCharroiTypesCourse(): Promise<CharroiTypeCourse[]> {
  const types = await listTypeCours();
  return types.map((t) => ({
    id: t.id,
    libelle: t.designation,
  }));
}

export async function listCharroiCourses(): Promise<CharroiCourse[]> {
  const courses = await listCoursesVehicule();
  return courses.map((c) => ({
    id: c.id,
    typeCourseId: c.typeCourseId,
    vehiculeId: c.vehiculeId,
    demandeur: c.matriculeAgent,
    destination: c.destination,
    motif: c.motif,
    statut:
      c.statut === "affecte" || c.statut === "en_cours"
        ? "en_cours"
        : c.statut === "terminee"
          ? "terminee"
          : "demande",
    chauffeurNom: c.chauffeur,
    dateDemande: c.dateDemande,
    typeCourseLibelle: c.typeCourseDesignation,
    vehiculeImmatriculation: c.vehiculePlaque,
  }));
}

export type CharroiDashboardPeriodFilter = {
  year: number;
  month?: number;
};

export async function getCharroiDashboardStats(period?: CharroiDashboardPeriodFilter) {
  const now = new Date();
  const year = period?.year ?? now.getFullYear();
  const month = period?.month;
  const periodFilter = { year, month };

  const [vehicules, courses, entretien, vehiculesRaw, entretienSuivi] = await Promise.all([
    listCharroiVehicules(),
    listCoursesVehicule(),
    getEntretienDashboard(),
    listVehicules(),
    listEntretienSuivi(),
  ]);

  const coursesInPeriod = courses.filter((c) =>
    matchesCoursePeriod(c.dateDemande, year, month ?? "")
  );

  const tabs = buildCharroiDashboardTabs({
    period: periodFilter,
    courses,
    entretienItems: entretienSuivi.items,
    vehiculesRaw,
    vehiculesEnPanne: entretien.vehiculesEnPanne,
  });

  return {
    vehiculesTotal: vehicules.length,
    vehiculesDisponibles: vehicules.filter((v) => v.statut === "disponible").length,
    demandesEnAttente: coursesInPeriod.filter((c) => c.statut === "demande").length,
    coursesEnCours: coursesInPeriod.filter(
      (c) => c.statut === "affecte" || c.statut === "en_cours"
    ).length,
    entretienEnRetard: entretien.entretienEnRetard,
    entretienAPlanifier: entretien.entretienAPlanifier,
    vehiculesEnPanne: entretien.vehiculesEnPanne,
    kmParcoursMois: kmParcoursPeriode(courses, year, month),
    alertesEntretien: entretien.alertes,
    tabs,
  };
}
