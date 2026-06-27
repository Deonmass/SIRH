import type { DocumentItem, Employee } from "@/lib/types";

export function documentIsFilled(doc: DocumentItem): boolean {
  return doc.received || Boolean(doc.fileRef || doc.fileName);
}

export function computeEmployeeDocumentCompletion(employee: Employee) {
  const required = employee.documents.filter((d) => d.required);
  const filled = required.filter(documentIsFilled);
  const missing = required.filter((d) => !documentIsFilled(d));
  return {
    requiredCount: required.length,
    filledCount: filled.length,
    percent: required.length ? Math.round((filled.length / required.length) * 100) : 100,
    missingLabels: missing.map((d) => d.label),
  };
}

/** Employés hors périmètre documentaire (sortis ou inactifs). */
const EXCLUDED_FROM_DOC_CHECKING = ["sorti", "licencie", "suspendu"] as const;

export function employeesDocumentCompletionList(employees: Employee[]) {
  return employees
    .filter((e) => !(EXCLUDED_FROM_DOC_CHECKING as readonly string[]).includes(e.status))
    .map((employee) => {
      const docOnly = computeEmployeeDocumentCompletion(employee);
      return {
        employee,
        percent: docOnly.percent,
        filledCount: docOnly.filledCount,
        requiredCount: docOnly.requiredCount,
        documentsPercent: docOnly.percent,
        missingLabels: docOnly.missingLabels,
      };
    })
    .sort((a, b) => a.percent - b.percent || a.filledCount - b.filledCount);
}
