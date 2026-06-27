import type { DbEmployeRow } from "../../../../database/migrations/003_employes.types";
import { resolveEmployeeExtraCosts } from "@/lib/extra-costs-resolve";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import type { Employee } from "@/lib/types";
import {
  CreateEmployeInput,
  employeeToProfilePatch,
  employeeToRow,
  employeIdFromApp,
  employeIdToApp,
  profilCoordsFromRow,
  rowToEmployee,
} from "./mapper";
import {
  disciplinaryRecordsToPayload,
  encodeEmployeDiscipline,
  parseEmployeDiscipline,
} from "@/lib/employes-discipline-json";
import { coordinatesHistoryToEmployeJson } from "./coordonnees-json";
import { documentsToEmployeJson } from "./documents-json";
import { nextMouvementCodeFromHistorique } from "./mouvement-json";
import { EMPTY_EMPLOYE_COORDONNEES_JSON } from "../../../../database/migrations/008_employes_coordonnees.types";
import { defaultDocumentsToEmployeJson, resolveEmployeeDocuments } from "./documents-json";
import { EMPTY_EMPLOYE_MOUVEMENT_JSON } from "../../../../database/migrations/006_employes_mouvement.types";
import type { DbEmployeMouvementJson } from "../../../../database/migrations/006_employes_mouvement.types";
import { parseEmployeMouvementJson } from "./mouvement-json";

const TABLE = "employes";

function client() {
  return createSupabaseAdminAnonClient();
}

function isMissingColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("schema cache") || lower.includes("could not find");
}

/** Met à jour une colonne JSON si elle existe en base (sinon ignoré). */
async function safeUpdateJsonColumn(
  id: string,
  column: "coordonnees" | "document",
  value: unknown,
  modif_par?: string | null
): Promise<void> {
  const numericId = employeIdFromApp(id);
  const { error } = await client()
    .from(TABLE)
    .update({
      [column]: value,
      modif_par: modif_par ?? null,
    })
    .eq("id", numericId);
  if (!error) return;
  if (isMissingColumnError(error.message)) return;
  throw new Error(`employes.update(${column}): ${error.message}`);
}

async function selectAllRows(): Promise<DbEmployeRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("id", { ascending: true });
  if (error) throw new Error(`employes.select: ${error.message}`);
  return (data ?? []) as DbEmployeRow[];
}

export async function nextEmployeMatricule(prefix = "RDC"): Promise<string> {
  const { count, error } = await client()
    .from(TABLE)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`employes.count: ${error.message}`);
  return `${prefix}-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export async function listEmployes(): Promise<DbEmployeRow[]> {
  return selectAllRows();
}

export async function getEmployeById(id: string): Promise<DbEmployeRow | null> {
  const numericId = employeIdFromApp(id);
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("id", numericId)
    .maybeSingle();
  if (error) throw new Error(`employes.get: ${error.message}`);
  return (data as DbEmployeRow | null) ?? null;
}

export function mergeEmployeWithLocal(row: DbEmployeRow, local?: Employee): Employee {
  const fromDb = rowToEmployee(row);
  if (!local) return fromDb;
  const merged: Employee = {
    ...local,
    ...profilCoordsFromRow(row),
    documents: resolveEmployeeDocuments(local.documents, row.document),
    movements: fromDb.movements,
    extraCosts: fromDb.extraCosts,
    coordinatesHistory: fromDb.coordinatesHistory?.length
      ? fromDb.coordinatesHistory
      : local.coordinatesHistory,
    leaveBalance: fromDb.leaveBalance,
    disciplinaryRecords: fromDb.disciplinaryRecords?.length
      ? fromDb.disciplinaryRecords
      : local.disciplinaryRecords,
    warningsCount: fromDb.warningsCount ?? local.warningsCount,
    overtimeMonthlyRecords: fromDb.overtimeMonthlyRecords?.length
      ? fromDb.overtimeMonthlyRecords
      : local.overtimeMonthlyRecords,
  };
  return { ...merged, extraCosts: resolveEmployeeExtraCosts(merged) };
}

export async function createEmploye(input: CreateEmployeInput): Promise<DbEmployeRow> {
  const core = {
    matricule: input.matricule,
    nom: input.nom,
    prenom: input.prenom,
    post_nom: input.post_nom ?? null,
    sexe: input.sexe ?? "M",
    date_naiss: input.date_naiss ?? null,
    lieu_naiss: input.lieu_naiss ?? null,
    nationalite: input.nationalite ?? "Congolaise (RDC)",
    statut_mat: input.statut_mat ?? "celibataire",
    statut: "candidat" as const,
    adresse: input.adresse ?? null,
    email_pro: input.email_pro ?? null,
    tel: input.tel ?? null,
    cree_par: input.cree_par ?? null,
  };

  const optionalJson = {
    mouvement: EMPTY_EMPLOYE_MOUVEMENT_JSON,
    coordonnees: EMPTY_EMPLOYE_COORDONNEES_JSON,
    document: defaultDocumentsToEmployeJson(),
  };

  let { data, error } = await client()
    .from(TABLE)
    .insert({ ...core, ...optionalJson })
    .select("*")
    .single();

  if (error && isMissingColumnError(error.message)) {
    ({ data, error } = await client().from(TABLE).insert(core).select("*").single());
  }

  if (error) throw new Error(`employes.insert: ${error.message}`);
  const row = data as DbEmployeRow;
  const appId = employeIdToApp(row.id);

  await safeUpdateJsonColumn(appId, "coordonnees", EMPTY_EMPLOYE_COORDONNEES_JSON);
  await safeUpdateJsonColumn(appId, "document", defaultDocumentsToEmployeJson());

  const { error: mouvementError } = await client()
    .from(TABLE)
    .update({ mouvement: EMPTY_EMPLOYE_MOUVEMENT_JSON })
    .eq("id", row.id);
  if (mouvementError && !isMissingColumnError(mouvementError.message)) {
    throw new Error(`employes.update(mouvement): ${mouvementError.message}`);
  }

  return (await getEmployeById(appId)) ?? row;
}

export async function updateEmploye(
  id: string,
  employee: Employee,
  modif_par?: string | null
): Promise<DbEmployeRow> {
  const numericId = employeIdFromApp(id);
  const audit = { modif_par: modif_par ?? null };
  const profilePatch = employeeToProfilePatch(employee, audit);
  const { data, error } = await client()
    .from(TABLE)
    .update(profilePatch)
    .eq("id", numericId)
    .select("*")
    .single();
  if (error) throw new Error(`employes.update: ${error.message}`);

  await safeUpdateJsonColumn(
    id,
    "coordonnees",
    coordinatesHistoryToEmployeJson(employee.coordinatesHistory ?? []),
    modif_par
  );
  await safeUpdateJsonColumn(
    id,
    "document",
    documentsToEmployeJson(employee.documents ?? []),
    modif_par
  );
  await updateEmployeDiscipline(id, employee.disciplinaryRecords ?? [], modif_par);

  const refreshed = await getEmployeById(id);
  return (refreshed ?? data) as DbEmployeRow;
}

export async function updateEmployeDiscipline(
  id: string,
  records: Employee["disciplinaryRecords"],
  modif_par?: string | null
): Promise<void> {
  const numericId = employeIdFromApp(id);
  const list = records ?? [];
  const existingRow = await getEmployeById(id);
  const existingPayload = parseEmployeDiscipline(existingRow?.discipline);
  const encoded =
    list.length > 0
      ? encodeEmployeDiscipline(disciplinaryRecordsToPayload(list, existingPayload))
      : null;

  const { error } = await client()
    .from(TABLE)
    .update({
      discipline: encoded,
      modif_par: modif_par ?? null,
    })
    .eq("id", numericId);

  if (!error) return;
  if (isMissingColumnError(error.message)) return;
  throw new Error(`employes.update(discipline): ${error.message}`);
}

export async function nextEmployeMouvementCode(): Promise<string> {
  const { data, error } = await client()
    .from(TABLE)
    .select("mouvement")
    .not("mouvement", "is", null);
  if (error) throw new Error(`employes.mouvementCodes: ${error.message}`);
  return nextMouvementCodeFromHistorique((data ?? []) as { mouvement?: unknown }[]);
}

export async function updateEmployeSoldeConge(
  id: string,
  solde_conge: string | null | undefined,
  opts?: { modif_par?: string | null; conges?: string | null }
): Promise<DbEmployeRow> {
  const numericId = employeIdFromApp(id);
  const patch: {
    solde_conge?: string | null;
    conges?: string | null;
    modif_par: string | null;
  } = { modif_par: opts?.modif_par ?? null };
  if (solde_conge !== undefined) patch.solde_conge = solde_conge;
  if (opts?.conges !== undefined) patch.conges = opts.conges;
  const { data, error } = await client()
    .from(TABLE)
    .update(patch)
    .eq("id", numericId)
    .select("*")
    .single();
  if (error) throw new Error(`employes.updateSoldeConge: ${error.message}`);
  return data as DbEmployeRow;
}

export async function updateEmployeOvertimeMonthlyJson(
  id: string,
  records: NonNullable<DbEmployeMouvementJson["heures_sup_mensuelles"]>,
  modif_par?: string | null
): Promise<DbEmployeRow> {
  const row = await getEmployeById(id);
  if (!row) throw new Error("employes.get: introuvable");
  const parsed = parseEmployeMouvementJson(row.mouvement);
  const mouvement: DbEmployeMouvementJson = {
    ...parsed,
    heures_sup_mensuelles: records,
  };
  return updateEmployeMouvementJson(id, mouvement, { modif_par });
}

export async function updateEmployeMouvementJson(
  id: string,
  mouvement: DbEmployeMouvementJson,
  opts?: {
    modif_par?: string | null;
    statut?: string | null;
    solde_conge?: string | null;
    conges?: string | null;
  }
): Promise<DbEmployeRow> {
  const numericId = employeIdFromApp(id);
  const patch: Record<string, unknown> = {
    mouvement,
    modif_par: opts?.modif_par ?? null,
  };
  if (opts?.statut != null) patch.statut = opts.statut;
  if (opts?.solde_conge !== undefined) patch.solde_conge = opts.solde_conge;
  if (opts?.conges !== undefined) patch.conges = opts.conges;

  const { data, error } = await client()
    .from(TABLE)
    .update(patch)
    .eq("id", numericId)
    .select("*")
    .single();
  if (error) throw new Error(`employes.updateMouvement: ${error.message}`);
  return data as DbEmployeRow;
}

export async function deleteEmploye(id: string): Promise<boolean> {
  const numericId = employeIdFromApp(id);
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", numericId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`employes.delete: ${error.message}`);
  return Boolean(data);
}

export { employeIdFromApp, employeIdToApp };
