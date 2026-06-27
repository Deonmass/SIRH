/** Payload JSON stocké dans `employes.solde_conge` (TEXT) */
export interface DbSoldeCongeJson {
  annee: number;
  acquis: number;
  pris: number;
  restant: number;
  reinit_le: string;
  date_reference: string;
  grade?: string | null;
  categorie?: number | null;
  bonus_anciennete?: number;
  jours_par_mois?: number;
  source: "affectation" | "reinit_annuelle" | "code_travail_art141";
}

export const MIGRATION_012_EMPLOYES_SOLDE_CONGE = {
  version: "012",
  name: "employes_solde_conge",
  tables: ["employes"] as const,
  column: "solde_conge",
  status: "pending_review" as const,
};
