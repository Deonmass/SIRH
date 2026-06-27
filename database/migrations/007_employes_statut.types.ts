import type { EmployeeStatus } from "@/lib/types";

/** Statuts RH persistés dans `employes.statut`. */
export const EMPLOYE_STATUT_VALUES = [
  "candidat",
  "pre_embauche",
  "essai",
  "actif",
  "conge",
  "suspendu",
  "preavis",
  "sorti",
  "licencie",
] as const satisfies readonly EmployeeStatus[];

export type DbEmployeStatut = (typeof EMPLOYE_STATUT_VALUES)[number];

export const MIGRATION_007_EMPLOYES_STATUT = {
  version: "007",
  name: "employes_statut",
  column: "statut",
  status: "pending_review" as const,
};
