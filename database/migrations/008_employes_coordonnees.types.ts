/** Entrée historique — colonne `employes.coordonnees` (JSONB) */
export interface DbCoordonneeJsonEntry {
  id: string;
  date_effet: string;
  adresse?: string | null;
  tel?: string | null;
  email_pro?: string | null;
  ville?: string | null;
  province?: string | null;
  pays?: string | null;
  tel_secondaire?: string | null;
  email_perso?: string | null;
  contact_urgence?: string | null;
  tel_urgence?: string | null;
  motif?: string | null;
  cree_le: string;
  cree_par?: string | null;
}

export interface DbEmployeCoordonneesJson {
  historique: DbCoordonneeJsonEntry[];
}

export const EMPTY_EMPLOYE_COORDONNEES_JSON: DbEmployeCoordonneesJson = { historique: [] };

export const MIGRATION_008_EMPLOYES_COORDONNEES = {
  version: "008",
  name: "employes_coordonnees",
  column: "coordonnees",
  status: "pending_review" as const,
};
