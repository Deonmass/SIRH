import type { DbCourseVehiculeRow } from "../../../database/migrations/037_courses_vehicule.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import {
  buildCourseObservations,
  parseCourseObservations,
} from "@/lib/charroi-course-observations";

export type CourseVehiculeStatut = "demande" | "affecte" | "en_cours" | "terminee";

export interface CourseVehicule {
  id: string;
  statut: CourseVehiculeStatut;
  dateDemande: string;
  matriculeAgent: string;
  typeCourseId?: string;
  depart?: string;
  destination?: string;
  motif?: string;
  vehiculeId?: string;
  chauffeur?: string;
  kmhDepart?: number;
  kmhArrive?: number;
  niveauCarburant?: number;
  passagers?: number;
  observations?: string;
  createdAt: string;
  updatedAt: string;
  typeCourseDesignation?: string;
  vehiculePlaque?: string;
}

export interface CourseDemandeInput {
  dateDemande: string;
  matriculeAgent: string;
  typeCourseId?: string;
  depart?: string;
  destination?: string;
  motif?: string;
}

export interface CourseAffectationInput {
  vehiculeId: string;
  chauffeur: string;
}

export interface CourseExecutionInput {
  kmhDepart?: number;
  kmhArrive?: number;
  niveauCarburant?: number;
  passagers?: number;
  observations?: string;
}

export interface CourseDepartInput {
  kmhDepart?: number;
  niveauCarburant?: number;
  passagers?: number;
  observationDepart?: string;
}

export interface CourseClotureInput {
  kmhArrive?: number;
  observationArrive?: string;
}

const TABLE = "courses_vehicule";

function client() {
  return createSupabaseAdminAnonClient();
}

function missingTable(error: { message: string; code?: string }) {
  return (
    error.code === "PGRST205" ||
    error.message.includes("Could not find the table") ||
    error.message.includes("schema cache")
  );
}

function rowToCourse(row: DbCourseVehiculeRow): CourseVehicule {
  return {
    id: String(row.id),
    statut: row.statut as CourseVehiculeStatut,
    dateDemande: row.date_demande,
    matriculeAgent: row.matricule_agent,
    typeCourseId: row.type_course_id != null ? String(row.type_course_id) : undefined,
    depart: row.depart ?? undefined,
    destination: row.destination ?? undefined,
    motif: row.motif ?? undefined,
    vehiculeId: row.vehicule_id != null ? String(row.vehicule_id) : undefined,
    chauffeur: row.chauffeur ?? undefined,
    kmhDepart: row.kmh_depart ?? undefined,
    kmhArrive: row.kmh_arrive ?? undefined,
    niveauCarburant: row.niveau_carburant != null ? Number(row.niveau_carburant) : undefined,
    passagers: row.passagers ?? undefined,
    observations: row.observations ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type JoinedRow = DbCourseVehiculeRow & {
  type_cours?: { designation: string | null } | null;
  vehicules?: { plaque: string | null } | null;
};

function mapJoined(row: JoinedRow): CourseVehicule {
  const course = rowToCourse(row);
  return {
    ...course,
    typeCourseDesignation: row.type_cours?.designation ?? undefined,
    vehiculePlaque: row.vehicules?.plaque ?? undefined,
  };
}

export async function listCoursesVehicule(): Promise<CourseVehicule[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*, type_cours(designation), vehicules(plaque)")
    .order("date_demande", { ascending: false })
    .order("id", { ascending: false });
  if (error) {
    if (missingTable(error)) return [];
    throw new Error(`courses_vehicule.select: ${error.message}`);
  }
  return ((data ?? []) as JoinedRow[]).map(mapJoined);
}

export async function vehiculesEnCourseIds(): Promise<Set<string>> {
  const { data, error } = await client()
    .from(TABLE)
    .select("vehicule_id")
    .in("statut", ["affecte", "en_cours"]);
  if (error) {
    if (missingTable(error)) return new Set();
    throw new Error(`courses_vehicule.affecte: ${error.message}`);
  }
  return new Set(
    (data ?? [])
      .map((row) => row.vehicule_id)
      .filter((id): id is number => id != null)
      .map(String)
  );
}

export async function createCourseDemande(input: CourseDemandeInput): Promise<CourseVehicule> {
  const { data, error } = await client()
    .from(TABLE)
    .insert({
      statut: "demande",
      date_demande: input.dateDemande,
      matricule_agent: input.matriculeAgent.trim(),
      type_course_id: input.typeCourseId ? Number(input.typeCourseId) : null,
      depart: input.depart?.trim() || null,
      destination: input.destination?.trim() || null,
      motif: input.motif?.trim() || null,
    })
    .select("*, type_cours(designation), vehicules(plaque)")
    .single();
  if (error) throw new Error(`courses_vehicule.insert: ${error.message}`);
  return mapJoined(data as JoinedRow);
}

export async function assignCourseVehicule(
  id: string,
  input: CourseAffectationInput
): Promise<CourseVehicule> {
  const { data, error } = await client()
    .from(TABLE)
    .update({
      statut: "affecte",
      vehicule_id: Number(input.vehiculeId),
      chauffeur: input.chauffeur.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(id))
    .eq("statut", "demande")
    .select("*, type_cours(designation), vehicules(plaque)")
    .single();
  if (error) throw new Error(`courses_vehicule.assign: ${error.message}`);
  return mapJoined(data as JoinedRow);
}

export async function updateCourseDemande(
  id: string,
  input: CourseDemandeInput
): Promise<CourseVehicule> {
  const { data, error } = await client()
    .from(TABLE)
    .update({
      date_demande: input.dateDemande,
      matricule_agent: input.matriculeAgent.trim(),
      type_course_id: input.typeCourseId ? Number(input.typeCourseId) : null,
      depart: input.depart?.trim() || null,
      destination: input.destination?.trim() || null,
      motif: input.motif?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(id))
    .eq("statut", "demande")
    .select("*, type_cours(designation), vehicules(plaque)")
    .single();
  if (error) throw new Error(`courses_vehicule.update_demande: ${error.message}`);
  return mapJoined(data as JoinedRow);
}

export async function updateCourseAffectation(
  id: string,
  input: CourseAffectationInput
): Promise<CourseVehicule> {
  const { data: current, error: fetchError } = await client()
    .from(TABLE)
    .select("vehicule_id, statut")
    .eq("id", Number(id))
    .maybeSingle();
  if (fetchError) throw new Error(`courses_vehicule.update_affectation.fetch: ${fetchError.message}`);
  if (!current || current.statut !== "affecte") {
    throw new Error("Cette affectation n'est plus modifiable.");
  }

  const newVehiculeId = String(input.vehiculeId);
  const previousVehiculeId =
    current.vehicule_id != null ? String(current.vehicule_id) : null;
  if (newVehiculeId !== previousVehiculeId) {
    const enCourse = await vehiculesEnCourseIds();
    if (enCourse.has(newVehiculeId)) {
      throw new Error("Ce véhicule est déjà affecté à une autre course.");
    }
  }

  const { data, error } = await client()
    .from(TABLE)
    .update({
      vehicule_id: Number(input.vehiculeId),
      chauffeur: input.chauffeur.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(id))
    .eq("statut", "affecte")
    .select("*, type_cours(designation), vehicules(plaque)")
    .single();
  if (error) throw new Error(`courses_vehicule.update_affectation: ${error.message}`);
  return mapJoined(data as JoinedRow);
}

export async function startCourseVehicule(
  id: string,
  input: CourseDepartInput
): Promise<CourseVehicule> {
  const observations = buildCourseObservations(input.observationDepart);
  const { data, error } = await client()
    .from(TABLE)
    .update({
      statut: "en_cours",
      kmh_depart: input.kmhDepart ?? null,
      niveau_carburant: input.niveauCarburant ?? null,
      passagers: input.passagers ?? 0,
      observations,
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(id))
    .eq("statut", "affecte")
    .select("*, type_cours(designation), vehicules(plaque)")
    .single();
  if (error) throw new Error(`courses_vehicule.depart: ${error.message}`);
  return mapJoined(data as JoinedRow);
}

export async function closeCourseVehicule(
  id: string,
  input: CourseClotureInput
): Promise<CourseVehicule> {
  const { data: existing, error: fetchError } = await client()
    .from(TABLE)
    .select("observations")
    .eq("id", Number(id))
    .eq("statut", "en_cours")
    .maybeSingle();
  if (fetchError) throw new Error(`courses_vehicule.cloture.fetch: ${fetchError.message}`);
  if (!existing) throw new Error("Course introuvable ou déjà clôturée");

  const prev = parseCourseObservations(existing.observations ?? undefined);
  const observations = buildCourseObservations(prev.depart, input.observationArrive);

  const { data, error } = await client()
    .from(TABLE)
    .update({
      statut: "terminee",
      kmh_arrive: input.kmhArrive ?? null,
      observations,
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(id))
    .eq("statut", "en_cours")
    .select("*, type_cours(designation), vehicules(plaque)")
    .single();
  if (error) throw new Error(`courses_vehicule.cloture: ${error.message}`);
  return mapJoined(data as JoinedRow);
}

/** @deprecated Utiliser startCourseVehicule + closeCourseVehicule */
export async function executeCourseVehicule(
  id: string,
  input: CourseExecutionInput
): Promise<CourseVehicule> {
  await startCourseVehicule(id, {
    kmhDepart: input.kmhDepart,
    niveauCarburant: input.niveauCarburant,
    passagers: input.passagers,
    observationDepart:
      typeof input.observations === "string" ? input.observations : undefined,
  });
  return closeCourseVehicule(id, {
    kmhArrive: input.kmhArrive,
    observationArrive: undefined,
  });
}

export async function deleteCourseVehicule(id: string): Promise<boolean> {
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", Number(id))
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`courses_vehicule.delete: ${error.message}`);
  return Boolean(data);
}
