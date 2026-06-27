import { latestMovement } from "./repositories/employes/mouvement-json";
import type { Employee, EmployeeStatus, MovementType } from "./types";

/** Statuts avant prise de poste — avancés lors d'une affectation. */
const PRE_ASSIGNMENT: EmployeeStatus[] = ["candidat", "pre_embauche"];

/**
 * Prochain statut après affectation à un poste (mouvement ou lien positionId).
 * candidat → pre_embauche → essai ; embauche force essai si encore en amont.
 */
export function statusAfterPositionAssignment(
  current: EmployeeStatus,
  movementType?: MovementType
): EmployeeStatus {
  if (!PRE_ASSIGNMENT.includes(current)) return current;

  if (movementType === "embauche") return "essai";
  if (current === "candidat") return "pre_embauche";
  if (current === "pre_embauche") return "essai";
  return current;
}

export function applyStatusAfterPositionAssignment(
  current: EmployeeStatus,
  movementType?: MovementType
): EmployeeStatus {
  return statusAfterPositionAssignment(current, movementType);
}

/** Statut effectif : synchronise candidat/pré-embauche quand un poste est déjà lié. */
export function resolveEmployeeStatus(
  employee: Pick<Employee, "status" | "positionId" | "movements">
): EmployeeStatus {
  const { status, positionId, movements } = employee;
  if (!positionId) return status;
  if (!PRE_ASSIGNMENT.includes(status)) return status;

  const latest = latestMovement(movements ?? []);
  const fromMovement = statusAfterPositionAssignment(status, latest?.type);
  if (fromMovement !== status) return fromMovement;

  if (latest?.type === "embauche") return "essai";
  if (status === "candidat") return "pre_embauche";

  return status;
}
