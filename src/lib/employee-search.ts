import { STATUS_LABELS } from "@/lib/constants";
import { employeeKindDetail, EMPLOYEE_KIND_LABELS } from "@/lib/employee-kind";
import { employeeDisplayName } from "@/lib/extra-costs";
import type { AppSettings, Employee } from "@/lib/types";

function flattenStrings(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (typeof value === "object") return Object.values(value).flatMap(flattenStrings);
  return [];
}

/** Texte indexé pour la recherche employé (tous champs visibles du profil). */
export function buildEmployeeSearchHaystack(
  employee: Employee,
  settings: AppSettings
): string {
  const statusLabel = STATUS_LABELS[employee.status]?.label ?? employee.status;
  const kindLabel = EMPLOYEE_KIND_LABELS[employee.employeeKind] ?? employee.employeeKind;
  const dossier = employee.dossier ?? {};

  return flattenStrings([
    employeeDisplayName(employee),
    employee.matricule,
    employee.nom,
    employee.postNom,
    employee.prenom,
    employee.email,
    employee.telephone,
    employee.department,
    employee.position,
    employee.positionId,
    employee.grade,
    employee.contractType,
    statusLabel,
    employee.status,
    kindLabel,
    employeeKindDetail(employee, settings),
    employee.nationalite,
    employee.adresse,
    employee.lieuNaissance,
    employee.dateNaissance,
    employee.numeroCnss,
    employee.numeroOnem,
    employee.maritalStatus,
    employee.hireDate,
    employee.trialEndDate,
    employee.contractEndDate,
    employee.recruitmentStartDate,
    employee.salary.currency,
    employee.salary.category,
    employee.salary.baseSalary,
    employee.family.map((m) => [m.nom, m.prenom, m.relation]),
    employee.documents.map((d) => [d.label, d.category, d.legalRef]),
    dossier,
  ])
    .join(" ")
    .toLowerCase();
}

/** Filtre par mots-clés (chaque terme doit apparaître quelque part). */
export function filterEmployeesBySearch(
  employees: Employee[],
  settings: AppSettings,
  query: string
): Employee[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return employees;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  return employees.filter((employee) => {
    const haystack = buildEmployeeSearchHaystack(employee, settings);
    return tokens.every((token) => haystack.includes(token));
  });
}
