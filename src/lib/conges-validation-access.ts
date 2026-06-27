import { isValidatorApproved, toDbValidatorField } from "@/lib/conges-validateur-field";
import { nextValidationLevel } from "@/lib/conges-validation";
import {
  canAccessSection,
  isAdminUsername,
  type PermissionAction,
  type PermissionMatrix,
} from "@/lib/permissions";
import type { CongeWithEmployee, Employee, LeaveRecord } from "@/lib/types";

export const CONGES_GESTION_SECTION = "conges.gestion";

export type CongeValidationLevel = 1 | 2;

export function congeValidationAction(level: CongeValidationLevel): PermissionAction {
  return level === 1 ? "validate1" : "validate2";
}

export function canValidateCongeLevel(
  matrix: PermissionMatrix,
  level: CongeValidationLevel,
  username?: string
): boolean {
  if (username && isAdminUsername(username)) return true;
  return canAccessSection(matrix, CONGES_GESTION_SECTION, congeValidationAction(level), username);
}

export function departmentForMatricule(
  matriculAgent: string | null | undefined,
  employees: Employee[]
): string | null {
  if (!matriculAgent?.trim()) return null;
  const emp = employees.find((e) => e.matricule === matriculAgent.trim());
  return emp?.department?.trim() || null;
}

export function sameDepartment(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function assertCongeValidationAllowed(input: {
  username: string;
  permissions: PermissionMatrix;
  matriculAgent: string | null;
  employees?: Employee[];
  /** Département résolu côté session (évite de recharger tous les employés). */
  validatorDepartment?: string | null;
  conge: Pick<CongeWithEmployee, "department"> & Pick<LeaveRecord, "validateur1" | "validation1At">;
  level: CongeValidationLevel;
}): { ok: true } | { ok: false; reason: string } {
  const { username, permissions, matriculAgent, employees = [], conge, level } = input;

  if (!canValidateCongeLevel(permissions, level, username)) {
    return {
      ok: false,
      reason: `Permission « Validation niveau ${level} » requise (Gestion des congés).`,
    };
  }

  if (!isAdminUsername(username)) {
    const validatorDept =
      input.validatorDepartment ?? departmentForMatricule(matriculAgent, employees);
    if (!validatorDept) {
      return {
        ok: false,
        reason:
          "Votre compte n'est pas lié à un agent (matricule) — impossible de valider en tant que chef de département.",
      };
    }
    if (!sameDepartment(validatorDept, conge.department)) {
      return {
        ok: false,
        reason: `Vous ne pouvez valider que les congés de votre département (${validatorDept}).`,
      };
    }
  }

  if (level === 2) {
    const raw1 = toDbValidatorField(conge.validateur1, conge.validation1At);
    if (!isValidatorApproved(raw1)) {
      return {
        ok: false,
        reason: "La validation niveau 2 requiert une validation niveau 1 signée.",
      };
    }
  }

  return { ok: true };
}

/** Indique si l'utilisateur peut appliquer une validation sur ce congé. */
export function userCanValidateConge(
  conge: Pick<CongeWithEmployee, "department"> &
    Pick<LeaveRecord, "validateur1" | "validation1At">,
  level: CongeValidationLevel,
  input: {
    username: string;
    permissions: PermissionMatrix;
    matriculAgent: string | null;
    employees?: Employee[];
    validatorDepartment?: string | null;
  }
): boolean {
  return assertCongeValidationAllowed({ ...input, conge, level }).ok;
}

/** Prochain niveau que l'utilisateur connecté peut signer sur ce congé. */
export function actionableValidationLevel(
  conge: Pick<CongeWithEmployee, "department" | "status"> &
    Pick<LeaveRecord, "validateur1" | "validateur2" | "validation1At" | "validation2At">,
  input: {
    username: string;
    permissions: PermissionMatrix;
    matriculAgent: string | null;
    employees?: Employee[];
    validatorDepartment?: string | null;
  }
): CongeValidationLevel | null {
  if (["refuse", "termine", "approuve"].includes(conge.status)) return null;
  const next = nextValidationLevel(
    conge.validateur1,
    conge.validateur2,
    conge.validation1At,
    conge.validation2At
  );
  if (!next) return null;
  return userCanValidateConge(conge, next, input) ? next : null;
}
