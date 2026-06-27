import type { DbSoldeCongeJson } from "./012_employes_solde_conge.types";

/** Ligne congé stockée dans `employes.solde_conge` (JSON). */
export interface DbSoldeCongeCongeJson {
  id: string;
  type: string;
  date_debut: string;
  date_fin: string;
  jours: number;
  statut: string;
  notes?: string | null;
  validateur_1?: string | null;
  validateur_2?: string | null;
  validation_1_at?: string | null;
  validation_2_at?: string | null;
  cree_le: string;
  modif_le?: string;
  /** Année de service (`solde.annee`) à l'enregistrement */
  annee?: number;
}

/** Archive d'une année de service passée */
export interface DbSoldeCongeHistoriqueJson {
  annee: number;
  acquis: number;
  pris: number;
  reinit_le: string;
  conges: DbSoldeCongeCongeJson[];
}

export type DbSoldeCongeJsonExtended = DbSoldeCongeJson & {
  conges?: DbSoldeCongeCongeJson[];
  historique?: DbSoldeCongeHistoriqueJson[];
};

export const MIGRATION_013_SOLDE_CONGE_CONGES_JSON = {
  version: "013",
  name: "solde_conge_conges_json",
  description: "Congés embarqués dans employes.solde_conge (plus de table conges)",
  status: "pending_review" as const,
};
