/** Ligne table `hopital_visite` */
export interface DbHopitalVisiteRow {
  id: number;
  matricule_agent: string | null;
  hopital: string | null;
  date_visite: string | null;
  motif: string | null;
  montant: number | null;
  fichiers: unknown | null;
  validation: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}
