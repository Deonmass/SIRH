import { computeComplianceReport } from "./compliance";
import { computeCnssMonthly } from "./cnss-compliance";
import type { Database } from "./types";

export interface ConformiteDashboardStats {
  totalActive: number;
  incompleteDossiers: number;
  documentComplianceRate: number;
  missingDocsTotal: number;
  sansNumeroCnss: number;
  sansNumeroOnem: number;
  cnssMasseCotisable: number;
  cnssTotalCotisations: number;
  topMissingDocs: { label: string; count: number }[];
  fieldGaps: { label: string; count: number }[];
}

export function buildConformiteDashboard(db: Database): ConformiteDashboardStats {
  const report = computeComplianceReport(db.employees);
  const cnss = computeCnssMonthly(db.employees, db.settings);

  let docsRequired = 0;
  let docsReceived = 0;
  db.employees.forEach((e) => {
    e.documents.forEach((d) => {
      if (!d.required) return;
      docsRequired++;
      if (d.received) docsReceived++;
    });
  });

  const topMissingDocs = report.byDocument
    .map((d) => ({ label: d.documentLabel, count: d.missingCount }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const fieldGaps = report.fieldGaps.map((g) => ({
    label: g.label,
    count: g.missingCount,
  }));

  return {
    totalActive: report.totalActive,
    incompleteDossiers: report.employeesWithIncompleteDossier,
    documentComplianceRate: docsRequired ? Math.round((docsReceived / docsRequired) * 100) : 100,
    missingDocsTotal: report.byDocument.reduce((s, d) => s + d.missingCount, 0),
    sansNumeroCnss: cnss.sansNumeroCnss,
    sansNumeroOnem: fieldGaps.find((g) => g.label.includes("ONEM"))?.count ?? 0,
    cnssMasseCotisable: cnss.totalMasseCotisable,
    cnssTotalCotisations: cnss.totalGlobal,
    topMissingDocs,
    fieldGaps,
  };
}
