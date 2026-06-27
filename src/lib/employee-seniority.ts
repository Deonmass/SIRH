import type { Employee } from "./types";

function parseHireDate(dateStr: string): Date | null {
  const normalized = dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Date d'embauche : champ dossier ou premier mouvement embauche / affectation. */
export function resolveEmployeeHireDate(
  employee: Pick<Employee, "hireDate" | "movements">
): string | undefined {
  if (employee.hireDate) return employee.hireDate;

  const hireMovement = [...(employee.movements ?? [])]
    .sort((a, b) =>
      (b.effectiveDate ?? b.date).localeCompare(a.effectiveDate ?? a.date)
    )
    .find((m) => m.type === "embauche" || m.type === "affectation");

  return hireMovement?.effectiveDate ?? hireMovement?.date;
}

/** Libellé d'ancienneté (ex. « 2 ans et 6 mois », « 3 mois »). */
export function formatSeniorityLabel(hireDate?: string): string | null {
  if (!hireDate) return null;
  const start = parseHireDate(hireDate);
  if (!start) return null;

  const now = new Date();
  if (now.getTime() < start.getTime()) return null;

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  years = Math.max(0, years);
  months = Math.max(0, months);

  if (years >= 1) {
    const yearPart = years === 1 ? "1 an" : `${years} ans`;
    if (months === 0) return yearPart;
    const monthPart = months === 1 ? "1 mois" : `${months} mois`;
    return `${yearPart} et ${monthPart}`;
  }

  if (months >= 1) {
    return months === 1 ? "1 mois" : `${months} mois`;
  }

  const totalDays = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  if (totalDays <= 0) return "0 jour";
  return totalDays === 1 ? "1 jour" : `${totalDays} jours`;
}
