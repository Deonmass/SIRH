/** Ligne congé stockée dans `employes.conges` (JSON). */
export interface DbEmployeCongeEntryJson {
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
  /** Année de service à l'enregistrement */
  annee?: number;
}

/** Archive d'une année de service passée */
export interface DbEmployeCongesHistoriqueJson {
  annee: number;
  acquis: number;
  pris: number;
  reinit_le: string;
  conges: DbEmployeCongeEntryJson[];
}

/** Payload JSON de `employes.conges` */
export interface DbEmployeCongesJson {
  conges: DbEmployeCongeEntryJson[];
  historique: DbEmployeCongesHistoriqueJson[];
}

export const MIGRATION_014_EMPLOYES_CONGES = {
  version: "014",
  name: "employes_conges",
  tables: ["employes"] as const,
  column: "conges",
  status: "pending_review" as const,
};
