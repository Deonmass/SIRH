import type { Employee, JobPosition } from "./types";

export function plannedHeadcount(position: Pick<JobPosition, "headcount">): number {
  return Math.max(1, position.headcount ?? 1);
}

export function employeesOnPosition(positionId: string, employees: Employee[]): Employee[] {
  return employees.filter((e) => e.positionId === positionId);
}

export function occupiedCount(position: JobPosition, employees: Employee[]): number {
  return employeesOnPosition(position.id, employees).length;
}

export function remainingSlots(position: JobPosition, employees: Employee[]): number {
  return Math.max(0, plannedHeadcount(position) - occupiedCount(position, employees));
}

export function isPositionFull(position: JobPosition, employees: Employee[]): boolean {
  return remainingSlots(position, employees) === 0 && occupiedCount(position, employees) > 0;
}

/** Poste encore ouvert à une affectation (effectif prévu non atteint). */
export function hasAssignableSlot(
  position: JobPosition,
  employees: Employee[],
  employeeId?: string
): boolean {
  if (position.status === "archived" || position.status === "draft") return false;
  if (employeeId && employees.some((e) => e.id === employeeId && e.positionId === position.id)) {
    return true;
  }
  return remainingSlots(position, employees) > 0;
}

/** À afficher dans Postes vacants / suggestions d'affectation. */
export function isVacantForListing(position: JobPosition, employees: Employee[]): boolean {
  if (position.status === "archived" || position.status === "draft") return false;
  return remainingSlots(position, employees) > 0;
}

export function countFilledSlots(positions: JobPosition[], employees: Employee[]): number {
  return positions.reduce(
    (sum, p) => sum + Math.min(occupiedCount(p, employees), plannedHeadcount(p)),
    0
  );
}

export function countVacantSlots(positions: JobPosition[], employees: Employee[]): number {
  return positions.reduce((sum, p) => sum + remainingSlots(p, employees), 0);
}

export function formatRemainingSlotsLabel(remaining: number): string {
  if (remaining <= 0) return "";
  return remaining === 1 ? "1 place restante" : `${remaining} places restantes`;
}

export interface PositionSlot {
  position: JobPosition;
  employee: Employee | null;
  slotIndex: number;
  slotKey: string;
  remainingOnPosition: number;
}

/** Déploie les emplacements (effectif prévu) pour l'organigramme. */
export function expandPositionSlots(
  position: JobPosition,
  employees: Employee[]
): PositionSlot[] {
  const planned = plannedHeadcount(position);
  const occupants = employeesOnPosition(position.id, employees);
  const remaining = Math.max(0, planned - occupants.length);

  return Array.from({ length: planned }, (_, slotIndex) => ({
    position,
    employee: occupants[slotIndex] ?? null,
    slotIndex,
    slotKey: `${position.id}-slot-${slotIndex}`,
    remainingOnPosition: remaining,
  }));
}
