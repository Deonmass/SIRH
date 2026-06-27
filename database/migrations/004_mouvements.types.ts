/**
 * Migration 004 — MOUVEMENTS
 *
 * Colonnes en français court · sans FK · liaisons par matricule et code poste.
 */

/** Types de mouvement en base (enum PostgreSQL `type_mouvement`) */
export type DbTypeMouvement =
  | "affectation"
  | "desaffectation"
  | "changement_poste"
  | "promotion"
  | "mutation"
  | "reclassement"
  | "embauche"
  | "confirmation_contrat"
  | "avenant_contrat"
  | "renouvellement_cdd"
  | "fin_periode_essai"
  | "fin_cdd"
  | "augmentation"
  | "avenant_salaire"
  | "avenant_avantages"
  | "suspension"
  | "reintegration"
  | "demission"
  | "licenciement"
  | "retraite"
  | "fin_mission";

/** Ligne table `mouvements` */
export interface DbMouvementRow {
  id: number;
  code_mouvement: string;
  matricule_employe: string;
  code_poste: string | null;
  type_mouvement: DbTypeMouvement;
  date_mouvement: string;
  document_annexe: string | null;
  cree_le: string;
  cree_par: string | null;
  modif_le: string;
  modif_par: string | null;
}

/** Libellés FR pour l'interface */
export { MOVEMENT_TYPE_LABELS as TYPE_MOUVEMENT_LABELS } from "@/lib/movement-type-labels";

/** Types nécessitant la sélection d'un poste cible */
export const TYPES_MOUVEMENT_AVEC_POSTE: DbTypeMouvement[] = [
  "affectation",
  "changement_poste",
  "promotion",
  "mutation",
  "reclassement",
  "embauche",
];

export function typeMouvementRequiertPoste(type: DbTypeMouvement): boolean {
  return TYPES_MOUVEMENT_AVEC_POSTE.includes(type);
}

export function typeMouvementDesaffecte(type: DbTypeMouvement): boolean {
  return type === "desaffectation";
}

/** Correspondance colonnes SQL ↔ propriétés métier */
export const MOUVEMENTS_COLUMN_MAP = {
  code_mouvement: "code",
  matricule_employe: "employeeMatricule",
  code_poste: "positionCode",
  type_mouvement: "type",
  date_mouvement: "date",
  document_annexe: "documentAnnexe",
  cree_le: "createdAt",
  cree_par: "createdBy",
  modif_le: "updatedAt",
  modif_par: "updatedBy",
} as const;
