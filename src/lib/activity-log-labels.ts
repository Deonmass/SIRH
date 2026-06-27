import type {
  ActivityAction,
  ActivityEntityType,
} from "../../database/migrations/025_xlog.types";

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  insertion: "Insertion",
  modification: "Modification",
  suppression: "Suppression",
  desactivation: "Désactivation",
  activation: "Activation",
  connexion: "Connexion",
  annulation: "Annulation",
};

export const ACTIVITY_ENTITY_LABELS: Record<ActivityEntityType, string> = {
  employe: "Employé",
  utilisateur: "Utilisateur",
  departement: "Département",
  poste: "Poste",
  conge: "Congé",
  formation: "Formation",
  mouvement: "Mouvement",
  configuration: "Configuration",
  pointage: "Pointage",
  paie: "Paie",
};
