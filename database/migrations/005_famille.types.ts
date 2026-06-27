/**
 * Migration 005 — FAMILLE
 *
 * Colonnes en français court · sans FK · liaison par matricule employé.
 */

export type DbFamilleLien = "pere" | "mere" | "conjoint" | "enfant" | "autre";

export type DbEmployeSexe = "M" | "F";

/** Ligne table `famille` */
export interface DbFamilleRow {
  id: number;
  matricule_employe: string;
  lien: DbFamilleLien;
  sexe: DbEmployeSexe | null;
  nom: string;
  prenom: string;
  date_naiss: string;
  a_charge: boolean;
  scolarise: boolean;
  jugement_recu: boolean;
  jugement_fichier: string | null;
  jugement_nom: string | null;
  cree_le: string;
  cree_par: string | null;
  modif_le: string;
  modif_par: string | null;
}

export const FAMILLE_LIEN_LABELS: Record<DbFamilleLien, string> = {
  pere: "Père",
  mere: "Mère",
  conjoint: "Conjoint(e)",
  enfant: "Enfant",
  autre: "Autre",
};
