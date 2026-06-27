import type { Currency, PaieRecord } from "@/lib/types";
import { resolvePaieNetWithExtras, rowToPaieRecord } from "@/lib/paie-utils";
import { listPaieFromDb } from "@/lib/repositories/paie";
import type { Employee } from "@/lib/types";

export interface PaieMasseReelleLine {
  paieId: string;
  employeeId?: string;
  matricule: string;
  nom: string;
  prenom: string;
  department: string;
  moisAnnee: string;
  net: number;
  gross: number;
  employerCost: number;
  cnssEmployee: number;
  cnssEmployer: number;
  ipr: number;
  inpp: number;
  onem: number;
  heuresSup: number;
  currency: Currency;
  daysPresent: number;
  daysSick: number;
  daysLeave: number;
  daysHoliday: number;
  clotureLe?: string;
}

export interface PaieMasseReelleBreakdown {
  moisAnnee: string;
  moisLabel: string;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  totalEmployerCost: number;
  totalCnssEmployee: number;
  totalCnssEmployer: number;
  totalIpr: number;
  totalInpp: number;
  totalOnem: number;
  totalHeuresSup: number;
  currency: Currency;
  lines: PaieMasseReelleLine[];
  byDepartment: {
    department: string;
    count: number;
    net: number;
    employerCost: number;
  }[];
}

export async function buildPaieMasseReelle(
  moisAnnee: string,
  employees: Employee[]
): Promise<PaieMasseReelleBreakdown> {
  const rows = await listPaieFromDb(moisAnnee);
  const byMatricule = new Map(employees.map((e) => [e.matricule, e]));

  const lines: PaieMasseReelleLine[] = rows.map((row) => {
    const rec = rowToPaieRecord(row);
    const emp = byMatricule.get(rec.matriculeEmploye);
    const r = rec.payrollResult;
    const cfg = rec.payrollConfig;
    return {
      paieId: rec.id,
      employeeId: emp?.id,
      matricule: rec.matriculeEmploye,
      nom: emp?.nom ?? "—",
      prenom: emp?.prenom ?? "",
      department: emp?.department ?? "—",
      moisAnnee: rec.moisAnnee,
      net: resolvePaieNetWithExtras(rec),
      gross: r.grossSalary,
      employerCost: r.totalEmployerCost,
      cnssEmployee: r.cnssEmployee,
      cnssEmployer: r.cnssEmployer,
      ipr: r.ipr,
      inpp: r.inpp,
      onem: r.onem,
      heuresSup: rec.heuresSup,
      currency: r.currency,
      daysPresent: cfg.daysPresent ?? 0,
      daysSick: cfg.daysSick ?? 0,
      daysLeave: cfg.daysAnnualLeave ?? 0,
      daysHoliday: cfg.daysHoliday ?? 0,
      clotureLe: rec.clotureLe,
    };
  });

  lines.sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"));

  const currency = lines[0]?.currency ?? "CDF";
  const sum = (pick: (l: PaieMasseReelleLine) => number) =>
    Math.round(lines.reduce((s, l) => s + pick(l), 0));

  const deptMap = new Map<string, { count: number; net: number; employerCost: number }>();
  for (const line of lines) {
    const d = deptMap.get(line.department) ?? { count: 0, net: 0, employerCost: 0 };
    d.count += 1;
    d.net += line.net;
    d.employerCost += line.employerCost;
    deptMap.set(line.department, d);
  }

  const [y, m] = moisAnnee.split("-").map(Number);
  const moisLabel = new Date(y, m - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return {
    moisAnnee,
    moisLabel,
    employeeCount: lines.length,
    totalGross: sum((l) => l.gross),
    totalNet: sum((l) => l.net),
    totalEmployerCost: sum((l) => l.employerCost),
    totalCnssEmployee: sum((l) => l.cnssEmployee),
    totalCnssEmployer: sum((l) => l.cnssEmployer),
    totalIpr: sum((l) => l.ipr),
    totalInpp: sum((l) => l.inpp),
    totalOnem: sum((l) => l.onem),
    totalHeuresSup: lines.reduce((s, l) => s + l.heuresSup, 0),
    currency,
    lines,
    byDepartment: [...deptMap.entries()]
      .map(([department, v]) => ({
        department,
        count: v.count,
        net: Math.round(v.net),
        employerCost: Math.round(v.employerCost),
      }))
      .sort((a, b) => b.net - a.net),
  };
}

export function enrichPointageWithPaie<T extends { matriculeEmploye: string }>(
  rows: T[],
  paieRecords: PaieRecord[]
): (T & {
  paieCloture?: boolean;
  paieNet?: number;
  paieCurrency?: Currency;
  paieExtraTotal?: number;
  paieTotalAvecExtras?: number;
})[] {
  const byMat = new Map(paieRecords.map((p) => [p.matriculeEmploye, p]));
  return rows.map((r) => {
    const p = byMat.get(r.matriculeEmploye);
    if (!p) return r;
    return {
      ...r,
      paieCloture: true,
      paieNet: p.payrollResult.netSalary,
      paieCurrency: p.payrollResult.currency,
      paieExtraTotal: p.extraCostsTotal ?? 0,
      paieTotalAvecExtras: p.totalAPayer ?? p.payrollResult.netSalary,
    };
  });
}
