import type { DbUtilisateurStatut } from "../../../../database/migrations/024_utilisateurs_actif.types";

export function actifFromStatut(statut: string | null | undefined): boolean {
  return statut !== "inactif";
}

export function statutFromActif(actif: boolean): DbUtilisateurStatut {
  return actif ? "actif" : "inactif";
}
