export interface DbCourseVehiculeRow {
  id: number;
  statut: string;
  date_demande: string;
  matricule_agent: string;
  type_course_id: number | null;
  depart: string | null;
  destination: string | null;
  motif: string | null;
  vehicule_id: number | null;
  chauffeur: string | null;
  kmh_depart: number | null;
  kmh_arrive: number | null;
  niveau_carburant: number | null;
  passagers: number | null;
  observations: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}
