import type { Employee, JobPosition } from "@/lib/types";

export function employeePosteLabel(
  employee: Employee,
  postesById?: Map<string, JobPosition>
): string {
  const fromPoste = employee.positionId
    ? postesById?.get(employee.positionId)?.title
    : undefined;
  return (employee.position?.trim() || fromPoste || "").trim();
}

export function isChauffeurEmployee(
  employee: Employee,
  postesById?: Map<string, JobPosition>
): boolean {
  const label = employeePosteLabel(employee, postesById).toLowerCase();
  return label.includes("chauffeur") || label.includes("driver");
}

export function filterChauffeurEmployees(
  employees: Employee[],
  postesById?: Map<string, JobPosition>
): Employee[] {
  return employees
    .filter((e) => isChauffeurEmployee(e, postesById))
    .sort((a, b) =>
      `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr")
    );
}
