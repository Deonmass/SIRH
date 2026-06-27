import {
  aggregatePaieMasseFromLines,
  emptyPaieMasseBreakdown,
  resolveMasseCurrency,
  totalDecaissement,
  type PaieMasseEmployeeLine,
  type PaieMasseMonthlyPoint,
} from "@/lib/paie-masse";
import { resolvePaieNetWithExtras, rowToPaieRecord } from "@/lib/paie-utils";
import { listPaieFromDb } from "@/lib/repositories/paie";
import type { AppSettings, Database, Employee } from "@/lib/types";

const MONTH_SHORT = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
] as const;

/** Lignes masse depuis les paies clôturées (pointage → table paie). */
export async function buildPaieMasseEmployeeLinesFromClosedPaie(
  period: string,
  employees: Employee[]
): Promise<PaieMasseEmployeeLine[]> {
  const rows = await listPaieFromDb(period);
  if (!rows.length) return [];

  const byMatricule = new Map(employees.map((e) => [e.matricule, e]));

  const lines = rows.map((row) => {
    const rec = rowToPaieRecord(row);
    const emp = byMatricule.get(rec.matriculeEmploye);
    const r = rec.payrollResult;
    const extra = rec.extraCostsTotal ?? 0;
    const netBulletin = r.netSalary;
    const decaissement = resolvePaieNetWithExtras(rec);
    const totalCharges = r.cnssEmployee + r.cnssEmployer + r.ipr + r.onem + r.inpp;

    return {
      employeeId: emp?.id ?? rec.matriculeEmploye,
      matricule: rec.matriculeEmploye,
      fullName: emp ? `${emp.prenom} ${emp.nom}`.trim() : rec.matriculeEmploye,
      department: emp?.department ?? "—",
      position: emp?.position ?? "—",
      net: Math.round(netBulletin),
      gross: Math.round(r.grossSalary),
      extraCosts: Math.round(extra),
      decaissement: Math.round(decaissement),
      cnssEmployee: Math.round(r.cnssEmployee),
      cnssEmployer: Math.round(r.cnssEmployer),
      ipr: Math.round(r.ipr),
      onem: Math.round(r.onem),
      inpp: Math.round(r.inpp),
      employerCost: Math.round(r.totalEmployerCost),
      totalCharges: Math.round(totalCharges),
    };
  });

  return lines.sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"));
}

/** Masse du mois — priorité aux runs clôturés en base. */
export async function buildPaieMasseForPeriodFromDb(
  db: Database,
  _settings: AppSettings,
  period: string
) {
  const employees = db.employees ?? [];
  const closedLines = await buildPaieMasseEmployeeLinesFromClosedPaie(period, employees);
  if (closedLines.length > 0) {
    const rows = await listPaieFromDb(period);
    const currency =
      (rows[0] ? rowToPaieRecord(rows[0]).payrollResult.currency : null) ??
      employees.find((e) => e.id === closedLines[0]!.employeeId)?.salary.currency ??
      "USD";
    return aggregatePaieMasseFromLines(closedLines, period, currency);
  }
  const currency = employees[0]?.salary.currency ?? resolveMasseCurrency(db, [], period);
  return emptyPaieMasseBreakdown(period, currency);
}

export async function buildPaieMasseAnnualSeriesFromDb(
  db: Database,
  settings: AppSettings,
  year: number
): Promise<PaieMasseMonthlyPoint[]> {
  const points: PaieMasseMonthlyPoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const period = `${year}-${String(m).padStart(2, "0")}`;
    const masse = await buildPaieMasseForPeriodFromDb(db, settings, period);
    points.push({
      period,
      month: m,
      monthLabel: MONTH_SHORT[m - 1],
      totalGross: masse.totalGross,
      totalNet: masse.totalNet,
      totalDecaissement: totalDecaissement(masse),
      totalCnss: masse.totalCnssEmployee + masse.totalCnssEmployer,
      totalIpr: masse.totalIpr,
      totalOnem: masse.totalOnem,
      totalInpp: masse.totalInpp,
      totalEmployerCost: masse.totalEmployerCost,
    });
  }
  return points;
}
