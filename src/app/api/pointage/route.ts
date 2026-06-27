import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getUtilisateur } from "@/lib/auth/users";
import {
  canCreatePointageDay,
  canModifyRecordedPointageDay,
  pointagePayloadModifiesPersistedDays,
} from "@/lib/pointage-access";
import {
  enrichPointageRecordWithConges,
  mergeJoursForMonthWithConges,
} from "@/lib/pointage-conges";
import {
  applyPayrollSyntheseToRecord,
  parsePointagePayload,
  rowToPointageRecord,
} from "@/lib/pointage-utils";
import {
  fullPermissionMatrix,
  isAdminUsername,
  normalizePermissionMatrix,
} from "@/lib/permissions";
import {
  getPointageByMatriculeMois,
  listPointageFromDb,
  upsertPointageInDb,
} from "@/lib/repositories/pointage";
import { getEmployees, getSettings, listAllConges } from "@/lib/store";
import type { CongeWithEmployee, Employee } from "@/lib/types";
import { resolveWorkMonthMode } from "@/lib/work-month-mode";
import type { DbPointageJourJson } from "../../../../database/migrations/019_pointage_table.types";

function leavesForMatricule(conges: CongeWithEmployee[], matricule: string) {
  return conges.filter((c) => c.matriculeEmploye === matricule);
}

function enrichPointageRecord(
  record: ReturnType<typeof rowToPointageRecord>,
  mois: string,
  conges: CongeWithEmployee[],
  employee: Employee | undefined,
  settings: Awaited<ReturnType<typeof getSettings>>
) {
  const withConges = enrichPointageRecordWithConges(
    record,
    mois,
    leavesForMatricule(conges, record.matriculeEmploye)
  );
  return applyPayrollSyntheseToRecord(
    withConges,
    resolveWorkMonthMode(employee, settings)
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mois = searchParams.get("mois") ?? undefined;
    const matricule = searchParams.get("matricule") ?? undefined;
    const [conges, employees, settings] = await Promise.all([
      listAllConges(),
      getEmployees(),
      getSettings(),
    ]);
    const employeeByMat = new Map(employees.map((e) => [e.matricule, e]));

    if (matricule && mois) {
      const row = await getPointageByMatriculeMois(matricule, mois);
      if (!row) return NextResponse.json(null);
      const record = rowToPointageRecord(row);
      return NextResponse.json(
        enrichPointageRecord(
          record,
          mois,
          conges,
          employeeByMat.get(matricule),
          settings
        )
      );
    }

    const rows = await listPointageFromDb(mois);
    return NextResponse.json(
      rows.map((row) => {
        const record = rowToPointageRecord(row);
        if (!mois) return record;
        return enrichPointageRecord(
          record,
          mois,
          conges,
          employeeByMat.get(record.matriculeEmploye),
          settings
        );
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur chargement pointage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function sessionPermissions() {
  const session = await getSessionUser();
  if (!session) return { session: null, permissions: {} };
  const fresh = await getUtilisateur(String(session.id));
  const permissions =
    fresh && isAdminUsername(fresh.username)
      ? fullPermissionMatrix()
      : normalizePermissionMatrix(fresh?.permissions ?? session.permissions);
  return { session, permissions };
}

export async function POST(request: Request) {
  try {
    const { session, permissions } = await sessionPermissions();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = (await request.json()) as {
      matriculeEmploye?: string;
      moisAnnee?: string;
      jours?: DbPointageJourJson[];
      verrouille?: boolean;
      commentaireMois?: string | null;
    };

    if (!body.matriculeEmploye?.trim() || !body.moisAnnee?.match(/^\d{4}-\d{2}$/)) {
      return NextResponse.json({ error: "Matricule et mois (YYYY-MM) requis" }, { status: 400 });
    }
    if (!Array.isArray(body.jours)) {
      return NextResponse.json({ error: "Jours requis" }, { status: 400 });
    }

    if (!canCreatePointageDay(permissions, session.username)) {
      return NextResponse.json({ error: "Permission insuffisante pour saisir le pointage" }, { status: 403 });
    }

    const matricule = body.matriculeEmploye.trim();
    const existingRow = await getPointageByMatriculeMois(matricule, body.moisAnnee);
    const persistedJours = existingRow
      ? parsePointagePayload(existingRow.pointage).jours
      : [];

    if (
      pointagePayloadModifiesPersistedDays(persistedJours, body.jours) &&
      !canModifyRecordedPointageDay(permissions, session.username)
    ) {
      return NextResponse.json(
        { error: "Permission insuffisante pour modifier un jour déjà enregistré" },
        { status: 403 }
      );
    }

    const conges = await listAllConges();
    const [employees, settings] = await Promise.all([getEmployees(), getSettings()]);
    const employee = employees.find((e) => e.matricule === matricule);
    const workMonthMode = resolveWorkMonthMode(employee, settings);

    const jours = mergeJoursForMonthWithConges(
      body.moisAnnee,
      body.jours,
      leavesForMatricule(conges, matricule)
    );

    const row = await upsertPointageInDb({
      matricul_employe: matricule,
      mois_annee: body.moisAnnee,
      jours,
      verrouille: body.verrouille,
      commentaire_mois: body.commentaireMois,
      workMonthMode,
    });

    const record = rowToPointageRecord(row);
    return NextResponse.json(
      enrichPointageRecord(record, body.moisAnnee, conges, employee, settings),
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur enregistrement pointage";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
