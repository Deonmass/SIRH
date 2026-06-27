/** Participant stocké dans `formations.participation` (JSONB array). */
export interface DbFormationParticipantJson {
  employe_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  departement: string;
  /** Note / cote obtenue */
  cote?: number | null;
  /** Objectif de points à atteindre */
  point_a_atteindre?: number | null;
}

export interface DbFormationRow {
  id: number;
  titre: string;
  date_debut: string;
  date_fin: string;
  niveau: string | null;
  instructeur: string | null;
  commentaire: string | null;
  participation: DbFormationParticipantJson[];
  cree_le: string;
  modif_le: string;
}

export const MIGRATION_017_FORMATIONS_TABLE = {
  version: "017",
  name: "formations_table",
  tables: ["formations"] as const,
  status: "pending_review" as const,
};
