/** Ligne table `Hopitales` */
export interface DbHopitalRow {
  id: number;
  hopital: string;
  date_debut_contrat: string | null;
  statut: string | null;
  cout_total: number | null;
}
