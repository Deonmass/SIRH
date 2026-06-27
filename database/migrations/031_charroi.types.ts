export interface DbCharroiVehiculeRow {
  id: number;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  statut: string;
  created_at: string;
}

export interface DbCharroiTypeCourseRow {
  id: number;
  libelle: string;
  description: string | null;
}

export interface DbCharroiCourseRow {
  id: number;
  type_course_id: number | null;
  vehicule_id: number | null;
  demandeur: string;
  destination: string | null;
  motif: string | null;
  statut: string;
  chauffeur_nom: string | null;
  chauffeur_employe_id: string | null;
  date_demande: string;
  date_debut: string | null;
  date_fin: string | null;
}
