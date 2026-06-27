import { DISCIPLINARY_TYPE_CONFIG } from "@/lib/disciplinary";
import type { DisciplinaryRecord, Employee } from "@/lib/types";

export interface DisciplineListRow {
  sanctionId: string;
  sortDate: string;
  employee: Employee;
  record: DisciplinaryRecord;
}

function sanctionSortDate(record: DisciplinaryRecord): string {
  return record.effectiveDate ?? record.date;
}

/** Toutes les sanctions, la plus récente en premier. */
export function buildDisciplineListRows(employees: Employee[]): DisciplineListRow[] {
  const rows: DisciplineListRow[] = [];
  for (const employee of employees) {
    for (const record of employee.disciplinaryRecords ?? []) {
      rows.push({
        sanctionId: record.id,
        sortDate: sanctionSortDate(record),
        employee,
        record,
      });
    }
  }
  return rows.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
}

export function filterDisciplineRows(
  rows: DisciplineListRow[],
  query: string
): DisciplineListRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(({ employee, record }) => {
    const cfg = DISCIPLINARY_TYPE_CONFIG[record.type];
    const haystack = [
      employee.prenom,
      employee.nom,
      employee.matricule,
      employee.department,
      cfg.label,
      record.reason,
      record.facts,
      record.issuedBy ?? "",
      record.status,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
