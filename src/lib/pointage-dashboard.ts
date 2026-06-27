import type { Employee, PointageListRow, PointageRecord } from "@/lib/types";
import { enrichPointageWithPaie } from "@/lib/paie-masse-reelle";
import { rowToPaieRecord } from "@/lib/paie-utils";
import { enrichPointageRecordWithConges, mergeJoursForMonthWithConges } from "@/lib/pointage-conges";
import { computePointageSynthese, rowToPointageRecord, syntheseToApp } from "@/lib/pointage-utils";
import { listPaieFromDb } from "@/lib/repositories/paie";
import { listPointageFromDb } from "@/lib/repositories/pointage";
import { listAllConges } from "@/lib/store";

export interface PointageDashboardData {
  moisAnnee: string;
  totalActifs: number;
  feuillesSaisies: number;
  feuillesVerrouillees: number;
  totalRetards: number;
  totalHeuresSup: number;
  totalAbsencesNonJustifiees: number;
  avgJoursPresents: number;
  rows: PointageListRow[];
}

const ACTIVE = new Set(["actif", "essai", "conge", "preavis"]);

export async function buildPointageDashboard(
  employees: Employee[],
  moisAnnee: string
): Promise<PointageDashboardData> {
  const [rowsDb, conges] = await Promise.all([listPointageFromDb(moisAnnee), listAllConges()]);
  let paieRecords: ReturnType<typeof rowToPaieRecord>[] = [];
  try {
    paieRecords = (await listPaieFromDb(moisAnnee)).map(rowToPaieRecord);
  } catch {
    paieRecords = [];
  }
  const byMatricule = new Map(
    rowsDb.map((r) => {
      const record = rowToPointageRecord(r);
      const empConges = conges.filter((c) => c.matriculeEmploye === record.matriculeEmploye);
      return [r.matricul_employe, enrichPointageRecordWithConges(record, moisAnnee, empConges)];
    })
  );

  const actifs = employees.filter((e) => ACTIVE.has(e.status));
  const listRows: PointageListRow[] = actifs.map((e) => {
    const rec = byMatricule.get(e.matricule);
    const empConges = conges.filter((c) => c.matriculeEmploye === e.matricule);
    const emptyJours = mergeJoursForMonthWithConges(moisAnnee, [], empConges);
    const emptySynthese = syntheseToApp(computePointageSynthese(emptyJours));
    return {
      ...(rec ?? {
        id: "",
        matriculeEmploye: e.matricule,
        moisAnnee,
        jours: emptyJours,
        synthese: emptySynthese,
        verrouille: false,
      }),
      employeId: e.id,
      nom: e.nom,
      prenom: e.prenom,
      departement: e.department,
    };
  });

  const saisies = listRows.filter((r) => r.id && r.jours.length > 0);
  const totalRetards = saisies.reduce((s, r) => s + r.synthese.retards, 0);
  const totalHeuresSup = saisies.reduce((s, r) => s + r.synthese.heures_sup_total, 0);
  const totalAbs = saisies.reduce((s, r) => s + r.synthese.absences_non_justifiees, 0);
  const avgJours =
    saisies.length > 0
      ? Math.round(
          saisies.reduce((s, r) => s + r.synthese.jours_presents, 0) / saisies.length
        )
      : 0;

  return {
    moisAnnee,
    totalActifs: actifs.length,
    feuillesSaisies: saisies.length,
    feuillesVerrouillees: saisies.filter((r) => r.verrouille).length,
    totalRetards,
    totalHeuresSup,
    totalAbsencesNonJustifiees: totalAbs,
    avgJoursPresents: avgJours,
    rows: enrichPointageWithPaie(
      listRows.sort((a, b) =>
        `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
      ),
      paieRecords
    ),
  };
}

export function enrichPointageRecord(
  record: PointageRecord,
  employee?: Employee
): PointageListRow {
  return {
    ...record,
    employeId: employee?.id,
    nom: employee?.nom,
    prenom: employee?.prenom,
    departement: employee?.department,
  };
}
