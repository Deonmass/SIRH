import { createDefaultDocuments, DEFAULT_DOCUMENTS } from "./constants";
import { resolveEmployeeStatus } from "./employee-status";
import { getEmployeeDossier } from "./employee-dossier";
import { countDisciplinaryWarnings } from "./disciplinary";
import { defaultExtraCosts } from "./extra-costs";
import type { DocumentItem, Employee, EmployeeOvertime } from "./types";

const DEFAULT_OVERTIME: EmployeeOvertime = {
  hours130: 0,
  hours160: 0,
  hours200: 0,
};

function mergeMissingDocuments(documents: DocumentItem[]): DocumentItem[] {
  const byId = new Map(documents.map((d) => [d.id, d]));
  for (const template of DEFAULT_DOCUMENTS) {
    if (!byId.has(template.id)) {
      byId.set(template.id, {
        ...template,
        received: false,
      });
    }
  }
  return Array.from(byId.values());
}

export function normalizeEmployee(employee: Employee): Employee {
  const disciplinaryRecords = employee.disciplinaryRecords ?? [];
  const overtime = {
    ...DEFAULT_OVERTIME,
    ...employee.overtime,
  };
  const documents =
    employee.documents?.length > 0
      ? mergeMissingDocuments(employee.documents)
      : createDefaultDocuments();

  const currency = employee.salary?.currency ?? "USD";
  const extraCosts = employee.extraCosts ?? defaultExtraCosts(currency);

  const employeeKind = employee.employeeKind ?? "interne";

  return {
    ...employee,
    status: resolveEmployeeStatus(employee),
    employeeKind,
    subcontractorId:
      employeeKind === "externe" ? employee.subcontractorId ?? null : null,
    journalierProviderId:
      employeeKind === "journalier" ? employee.journalierProviderId ?? null : null,
    extraCosts: { ...defaultExtraCosts(currency), ...extraCosts, currency: extraCosts.currency ?? currency },
    overtime,
    overtimeMonthlyRecords: employee.overtimeMonthlyRecords ?? [],
    disciplinaryRecords,
    documents,
    dossier: getEmployeeDossier(employee),
    warningsCount:
      employee.warningsCount ?? countDisciplinaryWarnings(disciplinaryRecords),
  };
}
