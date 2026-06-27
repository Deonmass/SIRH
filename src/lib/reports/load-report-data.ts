import { mergeCongeAlerts } from "@/lib/dashboard";
import { buildGlobalDashboard } from "@/lib/global-dashboard";
import { rowToFormationRecord } from "@/lib/formations-utils";
import { moisAnneeFromParts } from "@/lib/pointage-utils";
import { buildPointageDashboard } from "@/lib/pointage-dashboard";
import { listFormationsFromDb } from "@/lib/repositories/formations";
import { getDatabase, getEmployees, getSettings, listAllConges } from "@/lib/store";
import { buildRhReport } from "./build-rh-report";
import { loadEntrepriseSettingsForReport, resolveReportBranding } from "./pdf-branding";
import { parseReportPeriod } from "./period";
import type { ReportPeriod, ReportType, RhReportData } from "./types";

export async function loadRhReportData(
  type: ReportType,
  query: { year?: string; month?: string; semester?: string },
  options?: { hideSalaries?: boolean; companyName?: string; appOrigin?: string }
): Promise<RhReportData> {
  const period = parseReportPeriod(type, query);
  const monthIndex =
    period.type === "mensuel" && period.month ? period.month - 1 : new Date().getMonth();
  const moisAnnee = moisAnneeFromParts(period.year, monthIndex + 1);

  const [db, conges, employees, formationRows, entrepriseSettings] = await Promise.all([
    getDatabase(),
    listAllConges(),
    getEmployees(),
    listFormationsFromDb().catch(() => []),
    loadEntrepriseSettingsForReport(),
  ]);

  const pointage = await buildPointageDashboard(employees, moisAnnee);

  const stats = buildGlobalDashboard(db, {
    conges,
    formations: formationRows.map(rowToFormationRecord),
    pointage,
    year: period.year,
    month: monthIndex,
  });
  stats.alerts = mergeCongeAlerts(stats.alerts, conges);

  const branding = await resolveReportBranding(entrepriseSettings, {
    appOrigin: options?.appOrigin,
  });

  return buildRhReport(stats, period, {
    hideSalaries: options?.hideSalaries ?? false,
    companyName: options?.companyName ?? entrepriseSettings.companyName,
    branding,
    employees,
  });
}

export type { ReportPeriod };
