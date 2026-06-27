import {
  buildSoldeCongeAtAffectation,
  movementInitializesSoldeConge,
  reconcileSoldePris,
  renewSoldeCongeIfNeeded,
  soldeCongeToLeaveBalance,
  type CongeBalanceSettings,
  type SoldeCongePayload,
} from "@/lib/conges-balance";
import {
  archiveCurrentYearConges,
  congesPayloadToSoldeSlices,
  type EmployeCongesPayload,
} from "@/lib/employes-conges-json";
import { encodeSoldeCongeColumn } from "@/lib/solde-conges-json";
import type { Employee, JobPosition, LeaveBalance, Movement } from "@/lib/types";

export type SoldeCongeInitResult = {
  solde: SoldeCongePayload;
  leaveBalance: LeaveBalance;
  employee: Employee;
  created: boolean;
};

/** Poste utilisé pour le barème congé : dossier employé ou code du mouvement d'affectation. */
export function resolvePositionForSoldeConge(
  employee: Employee,
  movement: Movement | null | undefined,
  positions: JobPosition[]
): JobPosition | null {
  if (employee.positionId) {
    const linked = positions.find((p) => p.id === employee.positionId);
    if (linked) return linked;
  }
  const code = movement?.positionCode?.trim();
  if (code) {
    return positions.find((p) => p.code === code) ?? null;
  }
  return null;
}

export function existingSoldeBlocksInit(
  existing: SoldeCongePayload | null
): existing is SoldeCongePayload {
  return existing != null;
}

/** Construit le solde initial (art. 141 + grade paramétré) à la première affectation / embauche. */
export function buildInitialSoldeConge(params: {
  employee: Employee;
  movement: Movement;
  position: JobPosition | null;
  settings?: CongeBalanceSettings;
}): SoldeCongePayload {
  const effectiveDate = params.movement.effectiveDate ?? params.movement.date;
  return buildSoldeCongeAtAffectation({
    employee: {
      ...params.employee,
      hireDate: params.employee.hireDate ?? effectiveDate,
    },
    effectiveDate,
    position: params.position,
    settings: params.settings,
    existing: null,
  });
}

export function applySoldeCongeInitToEmployee(
  employee: Employee,
  solde: SoldeCongePayload,
  movement: Movement
): Employee {
  const effectiveDate = movement.effectiveDate ?? movement.date;
  return {
    ...employee,
    hireDate: employee.hireDate ?? effectiveDate,
    grade: (solde.grade as Employee["grade"]) ?? employee.grade,
    category: solde.categorie ?? employee.category,
    leaveBalance: soldeCongeToLeaveBalance(solde),
  };
}

/**
 * Première initialisation du JSON `employes.solde_conge` (affectation / embauche).
 * Ne réécrit pas un solde déjà présent.
 */
export function initializeSoldeCongeOnAffectation(params: {
  employee: Employee;
  movement: Movement;
  position: JobPosition | null;
  settings?: CongeBalanceSettings;
  existingSolde: SoldeCongePayload | null;
}): SoldeCongeInitResult | null {
  if (!movementInitializesSoldeConge(params.movement.type)) return null;
  const existing = params.existingSolde;
  if (existingSoldeBlocksInit(existing)) {
    return {
      solde: existing,
      leaveBalance: soldeCongeToLeaveBalance(existing),
      employee: applySoldeCongeInitToEmployee(params.employee, existing, params.movement),
      created: false,
    };
  }

  const solde = buildInitialSoldeConge(params);
  return {
    solde,
    leaveBalance: soldeCongeToLeaveBalance(solde),
    employee: applySoldeCongeInitToEmployee(params.employee, solde, params.movement),
    created: true,
  };
}

export type SoldeCongeMaintenanceResult = {
  solde: SoldeCongePayload;
  congesPayload: EmployeCongesPayload;
  leaveBalance: LeaveBalance;
  needsSoldeWrite: boolean;
  needsCongesWrite: boolean;
};

/** Renouvellement annuel + recalcul `pris` depuis `employes.conges`. */
export function maintainSoldeCongeState(params: {
  employee: Employee;
  solde: SoldeCongePayload;
  congesPayload: EmployeCongesPayload;
  position: JobPosition | null;
  settings?: CongeBalanceSettings;
}): SoldeCongeMaintenanceResult {
  let { solde, congesPayload } = params;
  let needsSoldeWrite = false;
  let needsCongesWrite = false;

  const { solde: renewed, changed: renewedChanged } = renewSoldeCongeIfNeeded({
    employee: params.employee,
    solde,
    position: params.position,
    settings: params.settings,
  });

  if (renewedChanged) {
    const archived = archiveCurrentYearConges(congesPayload, solde);
    if (archived !== congesPayload) {
      congesPayload = archived;
      needsCongesWrite = true;
    }
    solde = renewed;
    needsSoldeWrite = true;
  }

  const reconciled = reconcileSoldePris(solde, congesPayloadToSoldeSlices(congesPayload));
  if (reconciled.pris !== solde.pris || reconciled.restant !== solde.restant) {
    solde = reconciled;
    needsSoldeWrite = true;
  }

  return {
    solde,
    congesPayload,
    leaveBalance: soldeCongeToLeaveBalance(solde),
    needsSoldeWrite,
    needsCongesWrite,
  };
}

export function encodeSoldeCongeForDb(solde: SoldeCongePayload): string {
  return encodeSoldeCongeColumn(solde);
}
