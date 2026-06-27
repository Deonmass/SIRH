/** Ligne table `conges` (schéma utilisateur — types TEXT) */

export type DbCongeType =
  | "annuel"
  | "maladie"
  | "exceptionnel"
  | "maternite"
  | "sans_solde"
  | "autre";

export type DbCongeStatut =
  | "demande"
  | "validation_1"
  | "validation_2"
  | "approuve"
  | "refuse"
  | "termine";

export interface DbCongeRow {
  id: number;
  matricule_employe: string;
  type: DbCongeType | string;
  date_debut: string;
  date_fin: string;
  jours: number;
  statut: DbCongeStatut | string;
  notes: string | null;
  validateur_1: string | null;
  validateur_2: string | null;
  cree_le: string;
  cree_par: string | null;
  modif_le: string;
  modif_par: string | null;
}
