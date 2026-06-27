import type { CourseVehicule } from "@/lib/repositories/courses-vehicule";
import type { Vehicule } from "@/lib/repositories/vehicules";

export const DEFAULT_INTERVALLE_ENTRETIEN_KM = 10_000;
export const DEFAULT_ALERTE_AVANT_KM = 1_000;

export type EntretienAlertLevel = "ok" | "warning" | "overdue" | "unknown";

export interface EntretienVehiculeConfig {
  dernierEntretienKm?: number;
  dernierEntretienDate?: string;
  intervalleKm: number;
  alerteAvantKm: number;
}

export const ENTRETIEN_TYPE_OPTIONS = [
  "Révision / vidange",
  "Pneus",
  "Freins",
  "Climatisation",
  "Réparation carrosserie",
  "Autre",
] as const;

export type EntretienTypeOption = (typeof ENTRETIEN_TYPE_OPTIONS)[number];

export function formatEntretienTypes(types: string[]): string {
  const cleaned = types.map((t) => t.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(" · ") : "Entretien";
}

export interface EntretienHistoriqueEntry {
  id: string;
  date: string;
  type: string;
  types?: string[];
  kmOdometre?: number;
  kmParcourusDepuis?: number;
  cout?: number;
  prestataire?: string;
  notes?: string;
}

export interface CourseKmResume {
  courseId: string;
  dateDemande: string;
  chauffeur?: string;
  destination?: string;
  kmDepart?: number;
  kmArrive?: number;
  kmParcours?: number;
}

export interface EntretienSuiviRow {
  vehiculeId: string;
  plaque: string;
  marque: string;
  vehicleType?: string;
  horsService: boolean;
  kilometrageInitiale?: number;
  kmActuel?: number;
  kmParcoursCourses: number;
  nbCourses: number;
  nbCoursesKm: number;
  nbEntretiens: number;
  dernierEntretienKm?: number;
  dernierEntretienDate?: string;
  intervalleKm: number;
  alerteAvantKm: number;
  kmDepuisEntretien?: number;
  kmRestantEntretien?: number;
  prochainEntretienKm?: number;
  alertLevel: EntretienAlertLevel;
  alertLabel: string;
  peutPasserEntretien: boolean;
  coursesKm: CourseKmResume[];
  historique: EntretienHistoriqueEntry[];
}

export function formatKm(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")} km`;
}

export function courseKmParcours(course: CourseVehicule): number | undefined {
  const dep = course.kmhDepart;
  const arr = course.kmhArrive;
  if (dep == null || arr == null) return undefined;
  const delta = arr - dep;
  return delta > 0 ? delta : 0;
}

/** Dernier relevé compteur sur les courses (arrivée prioritaire). */
export function computeKmOdometerFromCourses(courses: CourseVehicule[]): number | undefined {
  let best: number | undefined;
  for (const course of courses) {
    if (course.statut !== "terminee" && course.statut !== "en_cours") continue;
    const candidates = [course.kmhArrive, course.kmhDepart].filter(
      (v): v is number => v != null && !Number.isNaN(v)
    );
    for (const km of candidates) {
      if (best == null || km > best) best = km;
    }
  }
  return best;
}

/**
 * Km actuel du véhicule :
 * - relevé compteur le plus récent (km arrivée à la clôture), sinon
 * - kilométrage initial + km parcourus sur les courses.
 */
export function computeKmActuel(
  kilometrageInitiale: number | undefined,
  courses: CourseVehicule[]
): number | undefined {
  const releveCourses = computeKmOdometerFromCourses(courses);
  if (releveCourses != null) return releveCourses;

  const kmParcours = sumKmParcoursCourses(courses);
  if (kilometrageInitiale != null) return kilometrageInitiale + kmParcours;
  if (kmParcours > 0) return kmParcours;
  return kilometrageInitiale;
}

export function sumKmParcoursCourses(courses: CourseVehicule[]): number {
  return courses
    .filter((c) => c.statut === "terminee" || c.statut === "en_cours")
    .reduce((sum, c) => sum + (courseKmParcours(c) ?? 0), 0);
}

export function countCoursesVehicule(courses: CourseVehicule[]): number {
  return courses.filter(
    (c) => c.statut === "terminee" || c.statut === "en_cours" || c.statut === "affecte"
  ).length;
}

export function buildCourseKmResume(course: CourseVehicule): CourseKmResume {
  return {
    courseId: course.id,
    dateDemande: course.dateDemande,
    chauffeur: course.chauffeur,
    destination: course.destination,
    kmDepart: course.kmhDepart,
    kmArrive: course.kmhArrive,
    kmParcours: courseKmParcours(course),
  };
}

export function computeProchainEntretienKm(
  kilometrageInitiale: number | undefined,
  dernierEntretienKm: number | undefined,
  intervalleKm: number
): number | undefined {
  const base = dernierEntretienKm ?? kilometrageInitiale;
  if (base == null) return undefined;
  return base + intervalleKm;
}

export function resolveEntretienAlert(
  kmActuel: number | undefined,
  prochainEntretienKm: number | undefined,
  alerteAvantKm: number
): {
  level: EntretienAlertLevel;
  label: string;
  kmRestant?: number;
  peutPasserEntretien: boolean;
} {
  if (kmActuel == null || prochainEntretienKm == null) {
    return { level: "unknown", label: "Km inconnu", peutPasserEntretien: false };
  }

  const kmRestant = prochainEntretienKm - kmActuel;

  if (kmRestant <= 0) {
    const depasse = Math.abs(kmRestant);
    return {
      level: "overdue",
      label: `Entretien dépassé de ${formatKm(depasse)}`,
      kmRestant: 0,
      peutPasserEntretien: true,
    };
  }

  if (kmRestant <= alerteAvantKm) {
    return {
      level: "warning",
      label: `Entretien dans ${formatKm(kmRestant)}`,
      kmRestant,
      peutPasserEntretien: true,
    };
  }

  return {
    level: "ok",
    label: `Prochain entretien dans ${formatKm(kmRestant)}`,
    kmRestant,
    peutPasserEntretien: false,
  };
}

export function buildEntretienSuiviRow(
  vehicule: Vehicule,
  courses: CourseVehicule[],
  config: EntretienVehiculeConfig,
  historique: EntretienHistoriqueEntry[],
  horsService: boolean
): EntretienSuiviRow {
  const coursesActives = courses.filter(
    (c) =>
      c.statut === "terminee" ||
      c.statut === "en_cours" ||
      c.statut === "affecte"
  );
  const coursesKm = courses
    .filter((c) => c.statut === "terminee" || c.statut === "en_cours")
    .map(buildCourseKmResume)
    .sort((a, b) => new Date(b.dateDemande).getTime() - new Date(a.dateDemande).getTime());

  const kmParcoursCourses = sumKmParcoursCourses(courses);
  const nbCoursesKm = coursesKm.filter((c) => c.kmParcours != null).length;
  const nbCourses = countCoursesVehicule(courses);
  const kmActuel = computeKmActuel(vehicule.kilometrageInitiale, courses);

  const referenceKm = config.dernierEntretienKm ?? vehicule.kilometrageInitiale;
  const kmDepuisEntretien =
    kmActuel != null && referenceKm != null
      ? Math.max(0, kmActuel - referenceKm)
      : undefined;

  const prochainEntretienKm = computeProchainEntretienKm(
    vehicule.kilometrageInitiale,
    config.dernierEntretienKm,
    config.intervalleKm
  );

  const alert = resolveEntretienAlert(kmActuel, prochainEntretienKm, config.alerteAvantKm);

  return {
    vehiculeId: vehicule.id,
    plaque: vehicule.plaque ?? `Véhicule #${vehicule.id}`,
    marque: vehicule.marque,
    vehicleType: vehicule.vehicleType,
    horsService,
    kilometrageInitiale: vehicule.kilometrageInitiale,
    kmActuel,
    kmParcoursCourses,
    nbCourses,
    nbCoursesKm,
    nbEntretiens: historique.length,
    dernierEntretienKm: config.dernierEntretienKm,
    dernierEntretienDate: config.dernierEntretienDate,
    intervalleKm: config.intervalleKm,
    alerteAvantKm: config.alerteAvantKm,
    kmDepuisEntretien,
    kmRestantEntretien: alert.kmRestant,
    prochainEntretienKm,
    alertLevel: alert.level,
    alertLabel: alert.label,
    peutPasserEntretien: alert.peutPasserEntretien,
    coursesKm,
    historique,
  };
}

export function kmParcoursMois(courses: CourseVehicule[], year: number, month: number): number {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return courses.reduce((sum, course) => {
    const t = new Date(course.dateDemande).getTime();
    if (Number.isNaN(t) || t < start.getTime() || t >= end.getTime()) return sum;
    if (course.statut !== "terminee" && course.statut !== "en_cours") return sum;
    return sum + (courseKmParcours(course) ?? 0);
  }, 0);
}

export function matchesCoursePeriod(
  dateDemande: string,
  year: number,
  month: number | ""
): boolean {
  const parts = dateDemande.slice(0, 10).split("-");
  if (parts.length < 2) return true;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(y) || y !== year) return false;
  if (month !== "" && m !== month) return false;
  return true;
}

/** Km parcourus sur un mois donné, ou cumul annuel si `month` est omis. */
export function kmParcoursPeriode(
  courses: CourseVehicule[],
  year: number,
  month?: number
): number {
  if (month != null) return kmParcoursMois(courses, year, month);
  return Array.from({ length: 12 }, (_, i) => kmParcoursMois(courses, year, i + 1)).reduce(
    (sum, km) => sum + km,
    0
  );
}

/** Prévisualisation à la clôture : km arrivée = nouveau compteur actuel. */
export function previewKmActuelCloture(
  kmArrive: number | undefined,
  kmDepartCourse: number | undefined,
  kilometrageInitiale?: number
): {
  kmActuel?: number;
  kmParcours?: number;
} {
  if (kmArrive == null || Number.isNaN(kmArrive)) {
    return { kmActuel: undefined, kmParcours: undefined };
  }
  const kmParcours =
    kmDepartCourse != null && !Number.isNaN(kmDepartCourse)
      ? Math.max(0, kmArrive - kmDepartCourse)
      : undefined;
  return { kmActuel: kmArrive, kmParcours };
}
