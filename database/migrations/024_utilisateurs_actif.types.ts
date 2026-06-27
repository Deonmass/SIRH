/** Complément migration 024 — colonne `statut` sur `utilisateurs`. */
export type DbUtilisateurStatutColumn = {
  statut: string;
};

export const UTILISATEUR_STATUT_VALUES = ["actif", "inactif"] as const;
export type DbUtilisateurStatut = (typeof UTILISATEUR_STATUT_VALUES)[number];
