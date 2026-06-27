/** Statut journalier — feuille de pointage usine */
export type DbPointageJourStatut =
  | "present"
  | "retard"
  | "absent_justifie"
  | "absent_non_justifie"
  | "maladie"
  | "conge"
  | "ferie"
  | "mission"
  | "repos";

export interface DbPointageJourJson {
  date: string;
  statut: DbPointageJourStatut;
  heure_arrivee?: string | null;
  heure_depart?: string | null;
  minutes_retard?: number | null;
  heures_sup?: number | null;
  commentaire?: string | null;
}

export interface DbPointageSyntheseJson {
  jours_presents: number;
  jours_maladie: number;
  jours_conge: number;
  jours_feries: number;
  jours_mission: number;
  jours_repos: number;
  absences_justifiees: number;
  absences_non_justifiees: number;
  retards: number;
  minutes_retard_total: number;
  heures_sup_total: number;
  /** Aligné simulateur paie */
  jours_prestes_paie: number;
  jours_maladie_paie: number;
  jours_conge_paie: number;
  jours_feries_paie: number;
}

export interface DbPointagePayloadJson {
  jours: DbPointageJourJson[];
  synthese: DbPointageSyntheseJson;
  verrouille?: boolean;
  commentaire_mois?: string | null;
  modif_le?: string;
}

export interface DbPointageRow {
  id: number;
  matricul_employe: string;
  mois_annee: string;
  pointage: string | null;
  cree_le: string;
  modif_le: string;
}
