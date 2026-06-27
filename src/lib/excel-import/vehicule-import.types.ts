/** En-têtes alignés sur « DECLARATION OF PPC B DRC VEHICLES » */
export const VEHICULE_IMPORT_HEADERS = [
  "N°",
  "MARQUE",
  "TYPE",
  "N°CHASSIS",
  "PLAQUE",
  "CV",
  "ASSUREUR",
  "DEPARTEMENT",
  "USER",
  "PROVENCE",
  "PPC & LOXEA",
  "Km/H",
  "MISE CIRCULATION",
  "AGE DU VEHICULE",
  "OBSERVATION TECH",
] as const;

export type VehiculeImportRow = {
  line: number;
  marque: string;
  vehicleType?: string;
  numeroChassis?: string;
  plaque?: string;
  cv?: number;
  assureur?: string;
  departement?: string;
  utilisateur?: string;
  province?: string;
  societeProprietaire?: string;
  kilometrageInitiale?: number;
  miseCirculation?: string;
  statut?: string;
};

export function vehiculeTemplateFilename(): string {
  return "modele_import_vehicules_charroi.xlsx";
}
