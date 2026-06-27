import { NextResponse } from "next/server";
import { mergeCongeAlerts } from "@/lib/dashboard";
import { buildGlobalDashboard } from "@/lib/global-dashboard";
import { rowToFormationRecord } from "@/lib/formations-utils";
import { moisAnneeFromParts } from "@/lib/pointage-utils";
import { buildPointageDashboard } from "@/lib/pointage-dashboard";
import { listFormationsFromDb } from "@/lib/repositories/formations";
import { getDatabase, getEmployees, listAllConges } from "@/lib/store";

export async function GET() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const moisAnnee = moisAnneeFromParts(year, month + 1);

  const [db, conges, employees, formationRows] = await Promise.all([
    getDatabase(),
    listAllConges(),
    getEmployees(),
    listFormationsFromDb().catch(() => []),
  ]);

  const pointage = await buildPointageDashboard(employees, moisAnnee);

  const stats = buildGlobalDashboard(db, {
    conges,
    formations: formationRows.map(rowToFormationRecord),
    pointage,
    year,
    month,
  });
  stats.alerts = mergeCongeAlerts(stats.alerts, conges);

  return NextResponse.json(stats);
}
