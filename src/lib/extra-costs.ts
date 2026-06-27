import type { Currency, EmployeeExtraCosts } from "@/lib/types";

export const EXTRA_COST_LABELS = {
  housing: "Ind. logement",
  mileage: "Ind. kilométrique",
  childrenEducation: "Étude des enfants",
  travel: "Voyages",
  variables: "Variables",
} as const;

export type ExtraCostField = keyof typeof EXTRA_COST_LABELS;

/** Libellés alignés sur le récapitulatif paie */
export const EXTRA_COST_RECAP_LABELS: Record<ExtraCostField, string> = {
  housing: "Ind. logement (extra)",
  mileage: "Ind. kilométrique",
  childrenEducation: "Étude des enfants",
  travel: "Voyages",
  variables: "Variables",
};

export const EXTRA_COST_FIELDS = (
  Object.keys(EXTRA_COST_LABELS) as ExtraCostField[]
).map((field) => ({ field, label: EXTRA_COST_RECAP_LABELS[field] }));

export function defaultExtraCosts(currency: Currency = "USD"): EmployeeExtraCosts {
  return {
    housing: 0,
    mileage: 0,
    childrenEducation: 0,
    travel: 0,
    variables: 0,
    currency,
  };
}

export function totalExtraCosts(costs: EmployeeExtraCosts): number {
  return (
    costs.housing +
    costs.mileage +
    costs.childrenEducation +
    costs.travel +
    costs.variables
  );
}

export function employeeDisplayName(emp: {
  prenom: string;
  nom: string;
  postNom?: string;
}): string {
  return [emp.prenom, emp.postNom, emp.nom].filter(Boolean).join(" ");
}
