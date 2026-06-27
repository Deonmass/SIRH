export interface DbVehiculeRow {
  id: number;
  marque: string;
  vehicle_type: string | null;
  numero_chassis: string | null;
  plaque: string | null;
  province: string | null;
  mise_circulation: string | null;
  cv: number | null;
  centre_de_cout: string | null;
  ASSUREUR?: string | null;
  DEPARTEMENT?: string | null;
  utilisateur?: string | null;
  "societe proprietaire"?: string | null;
  statut?: string | null;
  kilometrage_initiale?: number | null;
  entretien?: string | null;
  panne?: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}
