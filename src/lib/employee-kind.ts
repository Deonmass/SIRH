import type { AppSettings, Employee, EmployeeKind, MovementType, NamedOrgRef } from "@/lib/types";
import { MOVEMENT_TYPE_LABELS } from "@/lib/movement-type-labels";

export { MOVEMENT_TYPE_LABELS };

export function movementTypeLabel(type: MovementType): string {
  return MOVEMENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export const EMPLOYEE_KIND_LABELS: Record<EmployeeKind, string> = {
  interne: "Interne",
  externe: "Externe",
  journalier: "Journalier",
};

export function employeeKindBadgeClass(kind: EmployeeKind): string {
  switch (kind) {
    case "interne":
      return "bg-sky-500/15 text-sky-800 border-sky-500/30 dark:text-sky-300";
    case "externe":
      return "bg-violet-500/15 text-violet-800 border-violet-500/30 dark:text-violet-300";
    case "journalier":
      return "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300";
  }
}

export function resolveSubcontractorName(
  settings: AppSettings,
  id?: string | null
): string | null {
  if (!id) return null;
  return settings.subcontractors.find((s) => s.id === id && s.active)?.name ?? null;
}

export function resolveJournalierProviderName(
  settings: AppSettings,
  id?: string | null
): string | null {
  if (!id) return null;
  return settings.journalierProviders.find((j) => j.id === id && j.active)?.name ?? null;
}

export function employeeKindDetail(
  employee: Employee,
  settings: AppSettings
): string | null {
  if (employee.employeeKind === "externe") {
    const name = resolveSubcontractorName(settings, employee.subcontractorId);
    return name ? `Sous-traitant : ${name}` : "Sous-traitant non renseigné";
  }
  if (employee.employeeKind === "journalier") {
    const name = resolveJournalierProviderName(settings, employee.journalierProviderId);
    return name ? `Profil journalier : ${name}` : "Profil journalier non renseigné";
  }
  return null;
}

export function validateEmployeeKindFields(
  kind: EmployeeKind,
  subcontractorId?: string | null,
  journalierProviderId?: string | null
): string | null {
  if (kind === "externe" && !subcontractorId) {
    return "Un sous-traitant est obligatoire pour un employé externe.";
  }
  if (kind === "journalier" && !journalierProviderId) {
    return "Un profil journalier est obligatoire pour un employé journalier.";
  }
  return null;
}

export function newNamedOrgRef(name: string, code?: string): NamedOrgRef {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    code: code?.trim() || undefined,
    active: true,
  };
}
