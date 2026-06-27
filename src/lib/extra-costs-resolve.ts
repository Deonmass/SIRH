import { defaultExtraCosts, totalExtraCosts } from "./extra-costs";
import { sortMovementsDesc } from "./repositories/employes/mouvement-json";
import type { Employee, EmployeeExtraCosts } from "./types";

/** Coûts extra effectifs : dossier / racine JSON mouvement / entrée historique. */
export function resolveEmployeeExtraCosts(employee: Employee): EmployeeExtraCosts {
  const currency = employee.salary?.currency ?? "USD";
  const fromEmployee = {
    ...defaultExtraCosts(currency),
    ...employee.extraCosts,
    currency: employee.extraCosts?.currency ?? currency,
  };

  if (totalExtraCosts(fromEmployee) > 0) {
    return fromEmployee;
  }

  const latestWithExtras = sortMovementsDesc(employee.movements ?? []).find(
    (m) => m.extraCosts && totalExtraCosts(m.extraCosts) > 0
  );

  if (latestWithExtras?.extraCosts) {
    return {
      ...defaultExtraCosts(currency),
      ...latestWithExtras.extraCosts,
      currency: latestWithExtras.extraCosts.currency ?? currency,
    };
  }

  return fromEmployee;
}

export function withResolvedExtraCosts(employee: Employee): Employee {
  return {
    ...employee,
    extraCosts: resolveEmployeeExtraCosts(employee),
  };
}
