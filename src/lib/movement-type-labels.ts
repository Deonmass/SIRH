import type { MovementType } from "@/lib/types";

/** Libellés FR des types de mouvement (partagés UI client + serveur). */
export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  affectation: "Affectation",
  desaffectation: "Désaffectation",
  changement_poste: "Changement de poste",
  promotion: "Promotion",
  mutation: "Mutation",
  reclassement: "Reclassement",
  embauche: "Embauche",
  confirmation_contrat: "Confirmation de contrat",
  avenant_contrat: "Avenant de contrat",
  renouvellement_cdd: "Renouvellement CDD",
  fin_periode_essai: "Fin de période d'essai",
  fin_cdd: "Fin de CDD",
  augmentation: "Augmentation",
  avenant_salaire: "Avenant salaire",
  avenant_avantages: "Avenant avantages",
  suspension: "Suspension",
  reintegration: "Réintégration",
  demission: "Démission",
  licenciement: "Licenciement",
  retraite: "Retraite",
  fin_mission: "Fin de mission",
};
