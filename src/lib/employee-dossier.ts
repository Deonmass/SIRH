import type {
  Employee,
  EmployeeDossier,
  EmployeeFormationRecord,
  LeaveRecord,
  RemunerationHistoryEntry,
} from "./types";
import { v4 as uuidv4 } from "uuid";

export type DossierTabId =
  | "profil"
  | "coordonnees"
  | "postes_mouvements"
  | "remuneration"
  | "conges"
  | "documents"
  | "formations"
  | "discipline"
  | "paie"
  | "historique";

export const DEFAULT_DOSSIER: EmployeeDossier = {
  pays: "République démocratique du Congo",
  formations: [],
  formationHistory: [],
  leaveHistory: [],
  remunerationHistory: [],
  absencesJustifiees: 0,
  absencesNonJustifiees: 0,
  congesMaladie: 0,
  congesExceptionnels: 0,
};

function migrateFormations(d: EmployeeDossier): EmployeeFormationRecord[] {
  if (d.formationHistory && d.formationHistory.length > 0) return d.formationHistory;
  return (d.formations ?? []).map((f) => ({
    id: f.id,
    label: f.label,
    endDate: f.date,
    completed: true,
    evaluationScale: "5" as const,
  }));
}

function migrateRemunerationHistory(
  employee: Employee,
  d: EmployeeDossier
): RemunerationHistoryEntry[] {
  if (d.remunerationHistory && d.remunerationHistory.length > 0) {
    return d.remunerationHistory;
  }
  const fromMovements = employee.movements
    .filter((m) => m.toSalary != null)
    .map((m) => ({
      id: m.id,
      effectiveDate: m.effectiveDate,
      baseSalary: m.toSalary!,
      currency: employee.salary.currency,
      reason: m.reason,
    }));
  if (fromMovements.length > 0) return fromMovements;
  if (employee.hireDate && employee.salary.baseSalary > 0) {
    return [
      {
        id: uuidv4(),
        effectiveDate: employee.hireDate,
        baseSalary: employee.salary.baseSalary,
        currency: employee.salary.currency,
        reason: "Rémunération initiale",
      },
    ];
  }
  return [];
}

export function getEmployeeDossier(employee: Employee): EmployeeDossier {
  const raw = employee.dossier ?? {};
  return {
    ...DEFAULT_DOSSIER,
    ...raw,
    formationHistory: migrateFormations(raw),
    leaveHistory: raw.leaveHistory ?? [],
    remunerationHistory: migrateRemunerationHistory(employee, raw),
  };
}

export function mergeDossier(
  current: EmployeeDossier | undefined,
  patch: Partial<EmployeeDossier>
): EmployeeDossier {
  return {
    ...DEFAULT_DOSSIER,
    ...current,
    ...patch,
    formationHistory: patch.formationHistory ?? current?.formationHistory ?? [],
    leaveHistory: patch.leaveHistory ?? current?.leaveHistory ?? [],
    remunerationHistory: patch.remunerationHistory ?? current?.remunerationHistory ?? [],
  };
}

/** Fusionne une mise à jour partielle dans l'employé (dossier imbriqué inclus). */
export function mergeEmployeePatch(current: Employee, patch: Partial<Employee>): Employee {
  const next: Employee = { ...current, ...patch };
  if (patch.dossier) {
    next.dossier = mergeDossier(current.dossier, patch.dossier);
  }
  return next;
}

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  CDI: "CDI",
  CDD: "CDD",
  apprentissage: "Apprentissage",
  stage: "Stage",
  consultant: "Consultant",
};

export const MARITAL_LABELS: Record<string, string> = {
  celibataire: "Célibataire",
  marie: "Marié(e)",
  divorce: "Divorcé(e)",
  veuf: "Veuf(ve)",
};

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  annuel: "Congé annuel",
  maladie: "Maladie",
  exceptionnel: "Exceptionnel",
  maternite: "Maternité",
  sans_solde: "Sans solde",
  autre: "Autre",
};

export const LEAVE_STATUS_LABELS: Record<string, string> = {
  demande: "En demande",
  validation_1: "Validation 1",
  validation_2: "Validation 2",
  approuve: "Approuvé",
  refuse: "Refusé",
  termine: "Terminé",
};
