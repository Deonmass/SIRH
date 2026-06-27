/** Ligne formation stockée dans `employes.formations` (JSON). */
export interface DbEmployeFormationJson {
  /** Identifiant unique (UUID) */
  id: string;
  /** Intitulé de la formation */
  titre: string;
  /** Date de début (ISO YYYY-MM-DD) */
  date_debut?: string | null;
  /** Date de fin (ISO YYYY-MM-DD) */
  date_fin?: string | null;
  /** Niveau (ex. débutant, intermédiaire, avancé) */
  niveau?: string | null;
  /** Formateur / organisme / instructeur */
  instructeur?: string | null;
  /** Commentaire libre ou évaluation */
  commentaire?: string | null;
  /** Participation confirmée (présence effective) */
  participation?: boolean;
  cree_le?: string;
  modif_le?: string;
}

/** Payload JSON de `employes.formations` */
export interface DbEmployeFormationsJson {
  formations: DbEmployeFormationJson[];
}

export const MIGRATION_016_EMPLOYES_FORMATIONS = {
  version: "016",
  name: "employes_formations",
  tables: ["employes"] as const,
  column: "formations",
  status: "pending_review" as const,
};
