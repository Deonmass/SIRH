import {
  buildEntretienSuiviRow,
  kmParcoursMois,
  type EntretienSuiviRow,
} from "@/lib/charroi-entretien";
import { listCoursesVehicule } from "@/lib/repositories/courses-vehicule";
import { isVehiculeHorsService } from "@/lib/vehicule-pannes";
import { listVehicules } from "./vehicules.repository";
import {
  loadAllEntretienFromVehicules,
  loadEntretienDefaults,
  recordVehiculeEntretien,
  updateVehiculeEntretienSeuils,
} from "./vehicule-entretien.store";

export interface EntretienDashboardSummary {
  entretienEnRetard: number;
  entretienAPlanifier: number;
  vehiculesEnPanne: number;
  kmParcoursMois: number;
  alertes: EntretienSuiviRow[];
}

export async function listEntretienSuivi(): Promise<{
  items: EntretienSuiviRow[];
  defaults: { intervalleKm: number; alerteAvantKm: number };
}> {
  const vehicules = await listVehicules();
  const [courses, entretienByVehicule, defaults] = await Promise.all([
    listCoursesVehicule(),
    loadAllEntretienFromVehicules(vehicules),
    loadEntretienDefaults(),
  ]);

  const coursesByVehicule = new Map<string, typeof courses>();
  for (const course of courses) {
    if (!course.vehiculeId) continue;
    const list = coursesByVehicule.get(course.vehiculeId) ?? [];
    list.push(course);
    coursesByVehicule.set(course.vehiculeId, list);
  }

  const items = vehicules.map((vehicule) => {
    const stored = entretienByVehicule.get(vehicule.id);
    const config = stored?.config ?? {
      intervalleKm: defaults.intervalleKm,
      alerteAvantKm: defaults.alerteAvantKm,
    };
    return buildEntretienSuiviRow(
      vehicule,
      coursesByVehicule.get(vehicule.id) ?? [],
      config,
      stored?.historique ?? [],
      isVehiculeHorsService(vehicule.pannes)
    );
  });

  items.sort((a, b) => {
    const order = { overdue: 0, warning: 1, unknown: 2, ok: 3 };
    const diff = order[a.alertLevel] - order[b.alertLevel];
    if (diff !== 0) return diff;
    return (a.kmRestantEntretien ?? Number.MAX_SAFE_INTEGER) -
      (b.kmRestantEntretien ?? Number.MAX_SAFE_INTEGER);
  });

  return { items, defaults };
}

export function summarizeEntretienDashboard(items: EntretienSuiviRow[]): EntretienDashboardSummary {
  const alertes = items.filter(
    (r) => r.alertLevel === "overdue" || r.alertLevel === "warning"
  );

  return {
    entretienEnRetard: items.filter((r) => r.alertLevel === "overdue").length,
    entretienAPlanifier: items.filter((r) => r.alertLevel === "warning").length,
    vehiculesEnPanne: items.filter((r) => r.horsService).length,
    kmParcoursMois: 0,
    alertes: alertes.slice(0, 8),
  };
}

export async function getEntretienDashboard(): Promise<EntretienDashboardSummary> {
  const [{ items }, courses] = await Promise.all([listEntretienSuivi(), listCoursesVehicule()]);
  const now = new Date();
  const kmParcoursMoisValue = kmParcoursMois(courses, now.getFullYear(), now.getMonth() + 1);

  const summary = summarizeEntretienDashboard(items);
  return { ...summary, kmParcoursMois: kmParcoursMoisValue };
}

export {
  recordVehiculeEntretien,
  updateVehiculeEntretienSeuils,
};
