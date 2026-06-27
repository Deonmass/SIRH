import { promises as fs } from "fs";
import path from "path";
import {
  createDepartement as createDepartementInDb,
  deleteDepartement as deleteDepartementInDb,
  listDepartements as listDepartementsFromDb,
  updateDepartement as updateDepartementInDb,
} from "./repositories/departements";
import {
  createEmploye as createEmployeInDb,
  deleteEmploye as deleteEmployeInDb,
  listEmployes,
  mergeEmployeWithLocal,
  nextEmployeMatricule,
  nextEmployeMouvementCode,
  getEmployeById,
  updateEmploye as updateEmployeInDb,
  updateEmployeMouvementJson,
  updateEmployeOvertimeMonthlyJson,
  updateEmployeSoldeConge,
} from "./repositories/employes";
import {
  applyPosteFromLatestMovement,
  latestMovement,
  movementsToEmployeMouvementJson,
  parseEmployeMouvementJson,
} from "./repositories/employes/mouvement-json";
import {
  encodeSoldeCongeForDb,
  initializeSoldeCongeOnAffectation,
  maintainSoldeCongeState,
  resolvePositionForSoldeConge,
} from "./repositories/employes/solde-conge-service";
import { applyStatusAfterPositionAssignment } from "./employee-status";
import {
  sumAnnualLeaveTaken,
  reconcileSoldePris,
  resolveAffectationEffectiveDate,
  soldeCongeToLeaveBalance,
  type SoldeCongePayload,
} from "./conges-balance";
import { overtimeRecordsToMouvementEntries } from "./employes-overtime-json";
import { getEmployeeDossier } from "./employee-dossier";
import { employeIdToApp } from "./repositories/employes/mapper";
import {
  congesPayloadToSoldeSlices,
  encodeEmployeConges,
  findCongeInPayload,
  isEmployeCongesEmpty,
  listLeaveRecordsFromCongesPayload,
  parseEmbeddedCongesFromSoldeRaw,
  parseEmployeConges,
  readEmployeCongesColumnRaw,
  removeCongeFromPayload,
  upsertCongeInPayload,
  type EmployeCongesPayload,
} from "./employes-conges-json";
import { encodeSoldeCongeColumn, parseSoldeCongeColumn } from "./solde-conges-json";
import { listCongesByMatricule, rowToLeaveRecord } from "./repositories/conges";
import { withResolvedExtraCosts } from "./extra-costs-resolve";
import { departementLabels, suggestDepartementCode } from "./repositories/departements/mapper";
import {
  createFamilleMember,
  deleteFamilleByMatricule,
  deleteFamilleMember as deleteFamilleMemberInDb,
  listAllFamille,
  listFamilleByMatricule,
  rowToFamilyMember,
  updateFamilleMember as updateFamilleMemberInDb,
} from "./repositories/famille";
import type { DbPosteRow } from "../../database/migrations/001_postes.types";
import type { DbEmployeRow } from "../../database/migrations/003_employes.types";
import {
  applyPositionLinkFromPostes,
  createPoste,
  deletePoste,
  fetchPosteRows,
  getPosteById,
  listPostes,
  listPostesFromRows,
  normalizePositionStatus,
  updatePoste,
  updatePosteCached,
} from "./repositories/postes";
import { isSupabaseConfigured } from "./supabase/env";
import { getDefaultSettings } from "./default-settings";
import { generateEmployees } from "./seed-employees";
import { normalizeEmployee } from "./employee-normalize";
import { rebuildPositionHierarchy } from "./position-hierarchy";
import { generateSeedPositions } from "./seed-postes";
import {
  configurationTitreForSection,
  extractConfigurationSectionParams,
  mergeConfigurationParamsFromRows,
  normalizeEntrepriseSectionParams,
  type ConfigurationSectionId,
  CONFIGURATION_SECTIONS,
} from "./configuration-sections";
import {
  listConfigurations,
  upsertConfiguration,
  getConfigurationByTitre,
} from "./repositories/configuration";
import { parseCentresCoutsFromParams } from "./centre-des-couts-utils";
import { mergeSettings } from "./settings";
import {
  defaultAdminSeed,
  registerUtilisateurLocalStore,
} from "./auth/users";
import { resolvePermissions } from "./repositories/utilisateurs/mapper";
import type {
  ActivityLogEntry,
  AppSettings,
  CentreDesCouts,
  Database,
  Departement,
  Employee,
  JobPosition,
  FamilyMember,
  CongeWithEmployee,
  LeaveBalance,
  LeaveRecord,
  LeaveRequestStatus,
  LeaveType,
  Movement,
  OvertimeMonthlyRecord,
  PayslipArchiveRecord,
  PayslipData,
  PayslipTemplateConfig,
  Utilisateur,
  UtilisateurRecord,
} from "./types";
import { countWorkingDays } from "./conges-working-days";
import { deriveCongeStatus } from "./conges-validation";
import { isValidatorApproved, toDbValidatorField } from "./conges-validateur-field";
import { DEFAULT_PAYSLIP_TEMPLATE, normalizePayslipTemplate } from "./payslip-template-default";
import { countChargeDependents } from "./payroll-simulator-config";
import { logMutation, snapshot } from "./activity-log-mutation";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const SEED_VERSION = 4;

function usesSupabasePostes(): boolean {
  return isSupabaseConfigured();
}

function usesSupabaseDb(): boolean {
  return isSupabaseConfigured();
}

function departementsFromSettings(labels: string[]): Departement[] {
  const codes = new Set<string>();
  return labels.map((libelle, index) => {
    const code = suggestDepartementCode(libelle, codes);
    codes.add(code);
    const now = new Date().toISOString();
    return {
      id: `local-${index}`,
      code,
      libelle,
      ordre: index + 1,
      actif: true,
      description: "",
      createdAt: now,
      updatedAt: now,
    };
  });
}

function persistDepartementLabels(db: Database, labels: string[]) {
  db.settings = mergeSettings({ ...db.settings, departments: labels });
}

function dbEmployees(db: Database): Employee[] {
  return db.employees.map(normalizeEmployee);
}

/** Employés à jour (Supabase + mouvements) pour lier les postes occupés. */
async function employeesForPostesLinking(db: Database): Promise<Employee[]> {
  if (!usesSupabaseDb()) {
    return dbEmployees(db);
  }
  return attachEmployeeRelationsFromSupabase(await loadEmployeesFromDb(db));
}

async function loadPostesLinkingBundle(db: Database): Promise<{
  employeesLite: Employee[];
  positions: JobPosition[];
  posteRows: DbPosteRow[];
}> {
  if (!usesSupabaseDb()) {
    return {
      employeesLite: dbEmployees(db),
      positions: db.positions,
      posteRows: [],
    };
  }

  const employees = (await loadEmployeesFromDb(db)).map(normalizeEmployee);
  if (!usesSupabasePostes()) {
    return { employeesLite: employees, positions: db.positions, posteRows: [] };
  }

  const posteRows = await fetchPosteRows();
  const positions = listPostesFromRows(posteRows, employees);
  const employeesLite = employees.map((employee) => {
    const withMovement = applyPosteFromLatestMovement(employee, positions);
    const withPoste = applyPositionLinkFromPostes(withMovement, positions);
    return normalizeEmployee(withPoste);
  });

  return { employeesLite, positions, posteRows };
}

/** Variante légère (sans famille) pour les écritures mouvement / affectation. */
async function employeesForPostesLinkingLite(db: Database): Promise<Employee[]> {
  const bundle = await loadPostesLinkingBundle(db);
  return bundle.employeesLite;
}

type MovementPersistContext = {
  settings: AppSettings;
  employeesLite: Employee[];
  positions: JobPosition[];
  posteRows: DbPosteRow[];
  employeeRow: DbEmployeRow | null;
};

async function buildMovementPersistContext(
  db: Database,
  employeeId: string
): Promise<MovementPersistContext> {
  const [settings, bundle, employeeRow] = await Promise.all([
    getSettings(),
    loadPostesLinkingBundle(db),
    usesSupabaseDb() && /^\d+$/.test(employeeId)
      ? getEmployeById(employeeId)
      : Promise.resolve(null),
  ]);

  return {
    settings,
    employeeRow,
    employeesLite: bundle.employeesLite,
    positions: bundle.positions,
    posteRows: bundle.posteRows,
  };
}

async function attachFamilyFromSupabase(employees: Employee[]): Promise<Employee[]> {
  if (!usesSupabaseDb()) return employees;

  const rows = await listAllFamille();
  const byMatricule = new Map<string, FamilyMember[]>();
  for (const row of rows) {
    const member = rowToFamilyMember(row);
    const list = byMatricule.get(row.matricule_employe) ?? [];
    list.push(member);
    byMatricule.set(row.matricule_employe, list);
  }

  return employees.map((employee) => ({
    ...employee,
    family: byMatricule.get(employee.matricule) ?? employee.family ?? [],
    childrenCount: (byMatricule.get(employee.matricule) ?? employee.family ?? []).filter(
      (m) => m.relation === "enfant"
    ).length,
  }));
}

async function attachEmployeeRelationsFromSupabase(employees: Employee[]): Promise<Employee[]> {
  let result = await attachFamilyFromSupabase(employees);
  if (usesSupabasePostes()) {
    const positions = await listPostes(result);
    result = result.map((employee) => {
      const withMovement = applyPosteFromLatestMovement(employee, positions);
      const withPoste = applyPositionLinkFromPostes(withMovement, positions);
      return normalizeEmployee(withPoste);
    });
  } else {
    result = result.map((employee) => normalizeEmployee(employee));
  }
  return result.map((employee) => withResolvedExtraCosts(employee));
}

function applyFamilyUniqueConstraints(
  family: FamilyMember[],
  member: FamilyMember
): FamilyMember[] {
  let next = family.filter((m) => m.id !== member.id);
  if (member.relation === "pere") next = next.filter((m) => m.relation !== "pere");
  if (member.relation === "mere") next = next.filter((m) => m.relation !== "mere");
  if (member.relation === "conjoint") next = next.filter((m) => m.relation !== "conjoint");
  return [...next, member];
}

function syncEmployeeFamilyInDb(db: Database, employee: Employee) {
  const idx = db.employees.findIndex((e) => e.id === employee.id);
  if (idx >= 0) db.employees[idx] = employee;
}

/** Famille à jour depuis Supabase (le cache local peut être vide ou obsolète). */
async function ensureEmployeeFamilySynced(
  db: Database,
  employeeId: string
): Promise<Employee | null> {
  const employee = await ensureEmployeeInDb(db, employeeId);
  if (!employee) return null;
  if (!usesSupabaseDb()) return employee;

  const family = (await listFamilleByMatricule(employee.matricule)).map(rowToFamilyMember);
  const synced = normalizeEmployee({
    ...employee,
    family,
    childrenCount: family.filter((m) => m.relation === "enfant").length,
  });
  syncEmployeeFamilyInDb(db, synced);
  return synced;
}

async function ensureEmployeeInDb(db: Database, employeeId: string): Promise<Employee | null> {
  const existing = db.employees.find((e) => e.id === employeeId);
  if (existing) return normalizeEmployee(existing);

  const loaded = await loadEmployeesFromDb(db);
  const employee = loaded.find((e) => e.id === employeeId);
  if (!employee) return null;

  const idx = db.employees.findIndex((e) => e.id === employeeId);
  if (idx >= 0) db.employees[idx] = employee;
  else db.employees.push(employee);

  return normalizeEmployee(employee);
}

let serializedDbOps: Promise<unknown> = Promise.resolve();

function runSerialized<T>(fn: () => Promise<T>): Promise<T> {
  const op = serializedDbOps.then(fn, fn);
  serializedDbOps = op.then(
    () => undefined,
    () => undefined
  );
  return op;
}

function seedDatabase(): Database {
  const employees = generateEmployees(100);
  return {
    employees,
    positions: generateSeedPositions(employees),
    settings: getDefaultSettings(),
    movements: employees.flatMap((e) => e.movements),
    utilisateurs: [defaultAdminSeed()],
    seedVersion: SEED_VERSION,
  };
}

function ensureLocalUtilisateurs(db: Database): UtilisateurRecord[] {
  if (!db.utilisateurs?.length) {
    db.utilisateurs = [defaultAdminSeed()];
  }
  for (const user of db.utilisateurs) {
    if (user.actif === undefined) user.actif = true;
  }
  return db.utilisateurs;
}

function stripUtilisateurPassword(row: UtilisateurRecord): Utilisateur {
  const { passeword: _p, ...user } = row;
  return user;
}

function normalizeDb(db: Database): Database {
  db.settings = mergeSettings(db.settings);
  if (!usesSupabasePostes()) {
    if (!db.positions?.length) {
      db.positions = generateSeedPositions(db.employees ?? []);
    }
    const employeeIds = new Set((db.employees ?? []).map((e) => e.id));
    db.positions = db.positions.map((p) => ({
      ...p,
      employeeId: p.employeeId && employeeIds.has(p.employeeId) ? p.employeeId : null,
      status:
        p.employeeId && employeeIds.has(p.employeeId)
          ? p.status === "vacant"
            ? "active"
            : p.status
          : p.status === "archived"
            ? "archived"
            : "vacant",
    }));
    if ((db.seedVersion ?? 0) < 4) {
      rebuildPositionHierarchy(db.positions);
      db.seedVersion = 4;
    }
    for (const pos of db.positions) {
      if (pos.employeeId) {
        const emp = db.employees.find((e) => e.id === pos.employeeId);
        if (emp && emp.positionId !== pos.id) {
          emp.positionId = pos.id;
        }
      }
    }
  }
  if (!db.payslipTemplate) {
    db.payslipTemplate = DEFAULT_PAYSLIP_TEMPLATE;
  }
  if (!db.payslipArchives) {
    db.payslipArchives = [];
  }
  ensureLocalUtilisateurs(db);
  return db;
}

async function ensureDb(): Promise<Database> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DB_PATH, "utf-8");
    let db = JSON.parse(raw) as Database;
    if ((db.seedVersion ?? 0) < SEED_VERSION || db.employees.length < 100) {
      const fresh = seedDatabase();
      await fs.writeFile(DB_PATH, JSON.stringify(fresh, null, 2), "utf-8");
      return fresh;
    }
    return normalizeDb(db);
  } catch {
    const db = seedDatabase();
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    return db;
  }
}

async function saveDb(db: Database): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export async function getDatabase(): Promise<Database> {
  const db = await ensureDb();
  if (usesSupabaseDb()) {
    db.employees = await employeesForPostesLinking(db);
  }
  if (usesSupabasePostes()) {
    db.positions = await listPostes(db.employees);
  }
  return db;
}

async function loadEmployeesFromDb(db: Database): Promise<Employee[]> {
  if (!usesSupabaseDb()) {
    return db.employees.map(normalizeEmployee);
  }

  const rows = await listEmployes();
  const localById = new Map(db.employees.map((e) => [e.id, normalizeEmployee(e)]));

  const fromSupabase = rows.map((row) => {
    const id = String(row.id);
    const local = localById.get(id);
    return normalizeEmployee(mergeEmployeWithLocal(row, local));
  });

  return fromSupabase;
}

export async function getEmployees(): Promise<Employee[]> {
  const db = await ensureDb();
  return employeesForPostesLinking(db);
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const employees = await getEmployees();
  const employee = employees.find((e) => e.id === id) ?? null;
  if (!employee) return null;
  return refreshEmployeeSoldeConge(employee);
}

/** Dossier complet : profil, mouvements, solde, congés (colonnes employes). */
export async function getEmployeeDossierBundle(employeeId: string): Promise<{
  employee: Employee;
  conges: LeaveRecord[];
  leaveBalance: LeaveBalance;
} | null> {
  const employee = await getEmployee(employeeId);
  if (!employee) return null;

  let conges: LeaveRecord[] = [];
  let leaveBalance = employee.leaveBalance;

  if (employee.positionId) {
    const payload = await getEmployeeCongesFromSoldeColumn(employeeId);
    conges = payload?.conges ?? [];
    if (payload?.leaveBalance) leaveBalance = payload.leaveBalance;
  }

  const fullEmployee: Employee = {
    ...employee,
    leaveBalance,
    dossier: {
      ...getEmployeeDossier(employee),
      leaveHistory: conges,
    },
  };

  return { employee: fullEmployee, conges, leaveBalance };
}

async function resolvePositionForEmployee(
  db: Database,
  employee: Employee
): Promise<JobPosition | null> {
  if (!employee.positionId) return null;
  if (usesSupabasePostes()) {
    return getPosteById(employee.positionId, await employeesForPostesLinking(db));
  }
  return db.positions.find((p) => p.id === employee.positionId) ?? null;
}

async function refreshEmployeeSoldeConge(employee: Employee): Promise<Employee> {
  if (!usesSupabaseDb() || !/^\d+$/.test(employee.id)) return employee;

  const row = await getEmployeById(employee.id);
  if (!row) return employee;

  const db = await ensureDb();
  const settings = await getSettings();
  const employees = await employeesForPostesLinking(db);
  const positions = usesSupabasePostes()
    ? await listPostes(employees)
    : db.positions;
  const position = resolvePositionForSoldeConge(employee, latestMovement(employee.movements), positions);

  const solde = parseSoldeCongeColumn(row.solde_conge);
  let congesPayload = parseEmployeConges(readEmployeCongesColumnRaw(row));

  /** Pas d'insert ici : `solde_conge` est créé à l'affectation / embauche. */
  if (!solde) return employee;

  const maintained = maintainSoldeCongeState({
    employee,
    solde,
    congesPayload,
    position,
    settings,
  });

  if (maintained.needsCongesWrite || maintained.needsSoldeWrite) {
    await updateEmployeSoldeConge(
      employee.id,
      maintained.needsSoldeWrite ? encodeSoldeCongeForDb(maintained.solde) : undefined,
      maintained.needsCongesWrite
        ? { conges: encodeEmployeConges(maintained.congesPayload) }
        : undefined
    );
  }

  const updated: Employee = {
    ...employee,
    leaveBalance: maintained.leaveBalance,
    hireDate: employee.hireDate ?? maintained.solde.date_reference,
    grade: (maintained.solde.grade as Employee["grade"]) ?? employee.grade,
    category: maintained.solde.categorie ?? employee.category,
  };

  if (maintained.needsSoldeWrite || maintained.needsCongesWrite) {
    const idx = db.employees.findIndex((e) => e.id === employee.id);
    if (idx >= 0) db.employees[idx] = { ...db.employees[idx]!, ...updated };
  }

  return updated;
}

type SoldeCongePersistPatch = {
  solde_conge?: string;
  conges?: string;
};

function computeSoldeCongeOnAffectation(
  employee: Employee,
  movement: Movement,
  ctx: MovementPersistContext
): { employee: Employee; patch: SoldeCongePersistPatch | null } {
  const position = resolvePositionForSoldeConge(employee, movement, ctx.positions);
  const existing = ctx.employeeRow
    ? parseSoldeCongeColumn(ctx.employeeRow.solde_conge)
    : null;

  const init = initializeSoldeCongeOnAffectation({
    employee,
    movement,
    position,
    settings: ctx.settings,
    existingSolde: existing,
  });
  if (!init) return { employee, patch: null };

  if (!init.created || !usesSupabaseDb() || !/^\d+$/.test(employee.id)) {
    return { employee: init.employee, patch: null };
  }

  const congesInit = ctx.employeeRow?.conges?.trim()
    ? undefined
    : encodeEmployeConges({ conges: [], historique: [] });

  return {
    employee: init.employee,
    patch: {
      solde_conge: encodeSoldeCongeForDb(init.solde),
      ...(congesInit !== undefined ? { conges: congesInit } : {}),
    },
  };
}

async function persistLeaveChange(
  employeeId: string,
  solde: SoldeCongePayload,
  congesPayload: EmployeCongesPayload
): Promise<LeaveBalance> {
  const reconciled = reconcileSoldePris(solde, congesPayloadToSoldeSlices(congesPayload));
  await updateEmployeSoldeConge(employeeId, encodeSoldeCongeColumn(reconciled), {
    conges: encodeEmployeConges(congesPayload),
  });
  const leaveBalance = soldeCongeToLeaveBalance(reconciled);
  const db = await ensureDb();
  const idx = db.employees.findIndex((e) => e.id === employeeId);
  if (idx >= 0) db.employees[idx] = { ...db.employees[idx]!, leaveBalance };
  return leaveBalance;
}

async function migrateEmployeCongesColumn(
  row: NonNullable<Awaited<ReturnType<typeof getEmployeById>>>,
  congesPayload: EmployeCongesPayload,
  serviceYear: number
): Promise<{ congesPayload: EmployeCongesPayload; changed: boolean }> {
  if (!isEmployeCongesEmpty(congesPayload)) {
    return { congesPayload, changed: false };
  }

  const embedded = parseEmbeddedCongesFromSoldeRaw(row.solde_conge);
  if (!isEmployeCongesEmpty(embedded)) {
    return { congesPayload: embedded, changed: true };
  }

  try {
    const legacyRows = await listCongesByMatricule(row.matricule);
    if (legacyRows.length === 0) {
      return { congesPayload, changed: false };
    }
    let migrated = congesPayload;
    for (const legacyRow of legacyRows) {
      migrated = upsertCongeInPayload(migrated, rowToLeaveRecord(legacyRow), serviceYear);
    }
    return { congesPayload: migrated, changed: true };
  } catch {
    return { congesPayload, changed: false };
  }
}

/** Lecture `employes.conges` (historique / demandes) — sans récursion ni refresh solde. */
async function loadEmployeCongesColumn(employeeId: string): Promise<{
  row: NonNullable<Awaited<ReturnType<typeof getEmployeById>>>;
  congesPayload: EmployeCongesPayload;
} | null> {
  if (!usesSupabaseDb() || !/^\d+$/.test(employeeId)) return null;
  const row = await getEmployeById(employeeId);
  if (!row) return null;

  const solde = parseSoldeCongeColumn(row.solde_conge);
  const serviceYear = solde?.annee ?? new Date().getFullYear();
  let congesPayload = parseEmployeConges(readEmployeCongesColumnRaw(row));
  const { congesPayload: migrated, changed } = await migrateEmployeCongesColumn(
    row,
    congesPayload,
    serviceYear
  );
  congesPayload = migrated;

  if (changed) {
    await updateEmployeSoldeConge(employeeId, undefined, {
      conges: encodeEmployeConges(congesPayload),
    });
  }

  return { row, congesPayload };
}

/** Lecture CRUD : `employes.conges` + `employes.solde_conge` (si présent). */
async function loadEmployeLeaveContext(employeeId: string): Promise<{
  row: NonNullable<Awaited<ReturnType<typeof getEmployeById>>>;
  solde: SoldeCongePayload | null;
  congesPayload: EmployeCongesPayload;
} | null> {
  const congesCtx = await loadEmployeCongesColumn(employeeId);
  if (!congesCtx) return null;

  const solde = parseSoldeCongeColumn(congesCtx.row.solde_conge);
  return { row: congesCtx.row, solde, congesPayload: congesCtx.congesPayload };
}

/** Historique depuis `employes.conges`, solde depuis `employes.solde_conge`. */
export async function getEmployeeCongesFromSoldeColumn(employeeId: string): Promise<{
  conges: LeaveRecord[];
  leaveBalance: LeaveBalance | null;
} | null> {
  const ctx = await loadEmployeLeaveContext(employeeId);
  if (!ctx) return null;

  const conges = listLeaveRecordsFromCongesPayload(ctx.congesPayload, ctx.row.matricule);
  const leaveBalance = ctx.solde
    ? soldeCongeToLeaveBalance(
        reconcileSoldePris(ctx.solde, congesPayloadToSoldeSlices(ctx.congesPayload))
      )
    : null;

  return { conges, leaveBalance };
}

export async function employeeHasLinkedPoste(employeeId: string): Promise<boolean> {
  const employees = await getEmployees();
  return Boolean(employees.find((e) => e.id === employeeId)?.positionId);
}

/** Renouvellement annuel (ancienneté) + recalcul `pris` depuis `employes.conges`. */
export async function syncEmployeeLeaveBalance(employeeId: string): Promise<LeaveBalance | null> {
  const employees = await getEmployees();
  const employee = employees.find((e) => e.id === employeeId) ?? null;
  if (!employee) return null;
  const refreshed = await refreshEmployeeSoldeConge(employee);
  return refreshed.leaveBalance;
}

async function findCongeContext(congeId: string): Promise<{
  employeeId: string;
  matricule: string;
  solde: SoldeCongePayload;
  congesPayload: EmployeCongesPayload;
  record: LeaveRecord;
} | null> {
  if (!usesSupabaseDb()) return null;
  const rows = await listEmployes();
  for (const row of rows) {
    const solde = parseSoldeCongeColumn(row.solde_conge);
    if (!solde) continue;
    const congesPayload = parseEmployeConges(readEmployeCongesColumnRaw(row));
    const record = findCongeInPayload(congesPayload, congeId, row.matricule);
    if (record) {
      return {
        employeeId: employeIdToApp(row.id),
        matricule: row.matricule,
        solde,
        congesPayload,
        record,
      };
    }
  }
  return null;
}

export async function saveEmployee(employee: Employee): Promise<Employee> {
  return runSerialized(() => saveEmployeeInner(employee));
}

async function saveEmployeeInner(employee: Employee): Promise<Employee> {
  const db = await ensureDb();
  const idx = db.employees.findIndex((e) => e.id === employee.id);
  const prev = idx >= 0 ? db.employees[idx] : null;
  employee = normalizeEmployee(employee);
  employee.updatedAt = new Date().toISOString();

  if (
    employee.positionId &&
    prev?.positionId !== employee.positionId
  ) {
    const nextStatus = applyStatusAfterPositionAssignment(employee.status);
    if (nextStatus !== employee.status) {
      employee = { ...employee, status: nextStatus };
    }
  }

  if (usesSupabaseDb() && /^\d+$/.test(employee.id)) {
    const row = await updateEmployeInDb(employee.id, employee);
    employee = normalizeEmployee(mergeEmployeWithLocal(row, employee));
  }

  if (prev && prev.positionId !== employee.positionId) {
    const linkedEmployees = await employeesForPostesLinking(db);
    if (prev.positionId) {
      const oldPos = usesSupabasePostes()
        ? await getPosteById(prev.positionId, linkedEmployees)
        : db.positions.find((p) => p.id === prev.positionId) ?? null;
      const stillOccupied = linkedEmployees.some(
        (e) => e.id !== employee.id && e.positionId === prev.positionId
      );
      if (oldPos && !stillOccupied) {
        const vacantStatus =
          oldPos.status === "archived" ? "archived" : oldPos.status === "draft" ? "draft" : "vacant";
        const vacantPayroll = { ...oldPos.payroll, dependents: 0 };
        if (usesSupabasePostes()) {
          await updatePoste(
            { ...oldPos, employeeId: null, status: vacantStatus, payroll: vacantPayroll },
            linkedEmployees
          );
        } else {
          oldPos.employeeId = null;
          oldPos.status = vacantStatus;
          oldPos.payroll = vacantPayroll;
          oldPos.updatedAt = new Date().toISOString();
        }
      }
    }
    if (employee.positionId) {
      const newPos = usesSupabasePostes()
        ? await getPosteById(employee.positionId, linkedEmployees)
        : db.positions.find((p) => p.id === employee.positionId) ?? null;
      if (!newPos) {
        throw new Error("Fiche de poste introuvable ou supprimée.");
      }
      const occupantsOnPos = linkedEmployees.filter(
        (e) => e.positionId === newPos.id && e.id !== employee.id
      );
      const plannedHeadcount = Math.max(1, newPos.headcount ?? 1);
      if (occupantsOnPos.length >= plannedHeadcount) {
        throw new Error(
          `Effectif prévu atteint (${plannedHeadcount} salarié(s)) pour le poste « ${newPos.title} ».`
        );
      }
      if (usesSupabasePostes()) {
        await updatePoste(
          {
            ...newPos,
            employeeId: employee.id,
            status: newPos.status === "vacant" ? "active" : newPos.status,
          },
          linkedEmployees
        );
        await syncPositionAssignment(db, {
          ...newPos,
          employeeId: employee.id,
        });
      } else {
        newPos.employeeId = employee.id;
        if (newPos.status === "vacant") newPos.status = "active";
        await syncPositionAssignment(db, newPos);
      }
      employee = db.employees.find((e) => e.id === employee.id) ?? employee;
    }
  }

  if (idx >= 0) {
    db.employees[idx] = employee;
  } else {
    db.employees.push(employee);
  }
  db.movements = db.employees.flatMap((e) => e.movements);
  await saveDb(db);
  const saved = normalizeEmployee(employee);
  await logMutation({
    action: prev ? "modification" : "insertion",
    entityType: "employe",
    entityId: saved.id,
    entityLabel: `${saved.prenom} ${saved.nom}`.trim(),
    summary: prev
      ? `Modification employé ${saved.matricule}`
      : `Création employé ${saved.matricule}`,
    payloadBefore: prev ? snapshot(prev) : null,
    payloadAfter: snapshot(saved),
  });
  return saved;
}

export async function createEmployee(
  partial: Omit<Employee, "id" | "createdAt" | "updatedAt" | "matricule"> & {
    matricule?: string;
  }
): Promise<Employee> {
  const db = await ensureDb();
  const prefix = db.settings.matriculePrefix || "RDC";

  if (usesSupabaseDb()) {
    const matricule =
      partial.matricule ?? (await nextEmployeMatricule(prefix));
    const row = await createEmployeInDb({
      matricule,
      nom: partial.nom,
      prenom: partial.prenom,
      post_nom: partial.postNom ?? null,
      sexe: partial.sexe ?? "M",
      date_naiss: partial.dateNaissance ?? null,
      lieu_naiss: partial.lieuNaissance ?? null,
      nationalite: partial.nationalite ?? "Congolaise (RDC)",
      statut_mat: partial.maritalStatus ?? "celibataire",
      adresse: partial.adresse ?? null,
      email_pro: partial.email ?? null,
      tel: partial.telephone ?? null,
    });
    const employee = normalizeEmployee({
      ...mergeEmployeWithLocal(row),
      ...partial,
      id: String(row.id),
      matricule: row.matricule,
      overtime: partial.overtime ?? { hours130: 0, hours160: 0, hours200: 0 },
      disciplinaryRecords: partial.disciplinaryRecords ?? [],
      createdAt: row.cree_le,
      updatedAt: row.modif_le,
    } as Employee);
    const idx = db.employees.findIndex((e) => e.id === employee.id);
    if (idx >= 0) db.employees[idx] = employee;
    else db.employees.push(employee);
    db.movements = db.employees.flatMap((e) => e.movements);
    await saveDb(db);
    await logMutation({
      action: "insertion",
      entityType: "employe",
      entityId: employee.id,
      entityLabel: `${employee.prenom} ${employee.nom}`.trim(),
      summary: `Création employé ${employee.matricule}`,
      payloadAfter: snapshot(employee),
    });
    return employee;
  }

  const index = db.employees.length + 1;
  const employee: Employee = normalizeEmployee({
    ...partial,
    overtime: partial.overtime ?? { hours130: 0, hours160: 0, hours200: 0 },
    disciplinaryRecords: partial.disciplinaryRecords ?? [],
    id: crypto.randomUUID(),
    matricule:
      partial.matricule ??
      `${prefix}-${new Date().getFullYear()}-${String(index).padStart(4, "0")}`,
    sexe: partial.sexe ?? "M",
    grade: partial.grade ?? "Agent",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Employee);
  db.employees.push(employee);
  db.movements = db.employees.flatMap((e) => e.movements);
  await saveDb(db);
  await logMutation({
    action: "insertion",
    entityType: "employe",
    entityId: employee.id,
    entityLabel: `${employee.prenom} ${employee.nom}`.trim(),
    summary: `Création employé ${employee.matricule}`,
    payloadAfter: snapshot(employee),
  });
  return employee;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const db = await ensureDb();
  const existing = db.employees.find((e) => e.id === id) ?? (await getEmployee(id));
  if (!existing) return false;

  if (usesSupabaseDb() && /^\d+$/.test(id)) {
    if (existing.matricule) {
      await deleteFamilleByMatricule(existing.matricule);
    }
    const deleted = await deleteEmployeInDb(id);
    if (!deleted) return false;

    db.employees = db.employees.filter((e) => e.id !== id);
    db.movements = db.employees.flatMap((e) => e.movements);
    await saveDb(db);

    await logMutation({
      action: "suppression",
      entityType: "employe",
      entityId: existing.id,
      entityLabel: `${existing.prenom} ${existing.nom}`.trim(),
      summary: `Suppression employé ${existing.matricule}`,
      payloadBefore: snapshot(existing),
      payloadAfter: null,
    });
    return true;
  }

  const before = db.employees.length;
  db.employees = db.employees.filter((e) => e.id !== id);
  if (db.employees.length === before) return false;
  db.movements = db.employees.flatMap((e) => e.movements);
  await saveDb(db);
  await logMutation({
    action: "suppression",
    entityType: "employe",
    entityId: existing.id,
    entityLabel: `${existing.prenom} ${existing.nom}`.trim(),
    summary: `Suppression employé ${existing.matricule}`,
    payloadBefore: snapshot(existing),
    payloadAfter: null,
  });
  return true;
}

export type AddMovementResult = {
  movement: Movement;
  employee: Employee;
};

export async function addMovement(
  employeeId: string,
  movement: Omit<Movement, "id" | "employeeId">
): Promise<AddMovementResult | null> {
  return runSerialized(() => addMovementInner(employeeId, movement));
}

/** Charge un employé sans renouvellement / réconciliation du solde congé (lectures API rapides). */
export async function getEmployeeForMutation(id: string): Promise<Employee | null> {
  const db = await ensureDb();
  return ensureEmployeeInDb(db, id);
}

async function persistEmployeeMovementsJson(
  db: Database,
  employee: Employee,
  ctx: MovementPersistContext,
  soldePatch: SoldeCongePersistPatch | null,
  movement: Movement
): Promise<Employee> {
  const prevPositionId = employee.positionId;
  let updated = applyPosteFromLatestMovement(employee, ctx.positions);

  if (updated.positionId) {
    const latest = latestMovement(updated.movements ?? []);
    const nextStatus = applyStatusAfterPositionAssignment(
      updated.status,
      latest?.type
    );
    if (nextStatus !== updated.status) {
      updated = { ...updated, status: nextStatus };
    }
  }

  updated = normalizeEmployee(updated);

  if (usesSupabaseDb() && /^\d+$/.test(employee.id)) {
    const existingMouvement = parseEmployeMouvementJson(ctx.employeeRow?.mouvement);
    const row = await updateEmployeMouvementJson(
      employee.id,
      movementsToEmployeMouvementJson(updated.movements ?? [], updated.extraCosts, {
        heures_sup_mensuelles: existingMouvement.heures_sup_mensuelles,
      }),
      {
        statut: updated.status,
        modif_par: movement.createdBy ?? null,
        ...(soldePatch?.solde_conge !== undefined
          ? { solde_conge: soldePatch.solde_conge }
          : {}),
        ...(soldePatch?.conges !== undefined ? { conges: soldePatch.conges } : {}),
      }
    );
    ctx.employeeRow = row;

    if (prevPositionId && !updated.positionId && usesSupabasePostes()) {
      const oldPos = ctx.positions.find((p) => p.id === prevPositionId);
      const stillOccupied = ctx.employeesLite.some(
        (e) => e.id !== employee.id && e.positionId === prevPositionId
      );
      if (oldPos && !stillOccupied) {
        const vacantStatus =
          oldPos.status === "archived"
            ? "archived"
            : oldPos.status === "draft"
              ? "draft"
              : "vacant";
        const vacantPayroll = { ...oldPos.payroll, dependents: 0 };
        const result = await updatePosteCached(
          {
            ...oldPos,
            employeeId: null,
            status: vacantStatus,
            payroll: vacantPayroll,
          },
          ctx.employeesLite,
          ctx.posteRows
        );
        ctx.posteRows = result.rows;
      }
    }

    if (updated.positionId) {
      const newPos = ctx.positions.find((p) => p.id === updated.positionId);
      if (newPos && usesSupabasePostes()) {
        await syncPositionAssignment(
          db,
          {
            ...newPos,
            employeeId: updated.id,
            status: newPos.status === "vacant" ? "active" : newPos.status,
          },
          ctx
        );
        const synced = ctx.employeesLite.find((e) => e.id === updated.id);
        if (synced) {
          updated = { ...updated, ...synced };
        }
      }
    }
  }

  updated.updatedAt = new Date().toISOString();
  return updated;
}

async function addMovementInner(
  employeeId: string,
  movement: Omit<Movement, "id" | "employeeId">
): Promise<AddMovementResult | null> {
  const db = await ensureDb();
  const employee = await ensureEmployeeInDb(db, employeeId);
  if (!employee) return null;

  const ctx = await buildMovementPersistContext(db, employeeId);

  const now = new Date().toISOString();
  const code =
    movement.code ??
    (usesSupabaseDb() ? await nextEmployeMouvementCode() : `MVT-LOCAL-${Date.now()}`);

  const m: Movement = {
    ...movement,
    id: crypto.randomUUID(),
    employeeId,
    code,
    createdAt: now,
    updatedAt: now,
  };

  const draft: Employee = {
    ...employee,
    movements: [m, ...(employee.movements ?? [])],
    updatedAt: now,
  };

  const { employee: withSoldePreview, patch: soldePatch } = computeSoldeCongeOnAffectation(
    draft,
    m,
    ctx
  );

  const persisted = await persistEmployeeMovementsJson(
    db,
    withSoldePreview,
    ctx,
    soldePatch,
    m
  );

  const idx = db.employees.findIndex((e) => e.id === employee.id);
  if (idx >= 0) db.employees[idx] = persisted;
  else db.employees.push(persisted);
  db.movements = db.employees.flatMap((e) => e.movements);

  if (!usesSupabaseDb()) {
    await saveDb(db);
  }

  void logMutation({
    action: "insertion",
    entityType: "mouvement",
    entityId: `${employeeId}:${m.id}`,
    entityLabel: `${persisted.prenom} ${persisted.nom}`.trim(),
    summary: `Mouvement ${m.type} — ${persisted.matricule}`,
    payloadAfter: snapshot({ employeeId, movement: m, employee: persisted }),
  });

  return { movement: m, employee: persisted };
}

export async function updateMovement(
  employeeId: string,
  movementId: string,
  patch: Omit<Movement, "id" | "employeeId">
): Promise<Movement | null> {
  return runSerialized(() => updateMovementInner(employeeId, movementId, patch));
}

async function updateMovementInner(
  employeeId: string,
  movementId: string,
  patch: Omit<Movement, "id" | "employeeId">
): Promise<Movement | null> {
  const db = await ensureDb();
  const employee = await ensureEmployeeInDb(db, employeeId);
  if (!employee) return null;
  const index = employee.movements.findIndex((m) => m.id === movementId);
  if (index < 0) return null;
  const beforeMovement = employee.movements[index];
  const beforeEmployee = snapshot({ ...employee, movements: [...employee.movements] });

  const updated: Movement = {
    ...employee.movements[index],
    ...patch,
    id: movementId,
    employeeId,
    updatedAt: new Date().toISOString(),
  };

  employee.movements[index] = updated;
  employee.updatedAt = new Date().toISOString();

  const ctx = await buildMovementPersistContext(db, employeeId);
  const persisted = await persistEmployeeMovementsJson(db, employee, ctx, null, updated);
  Object.assign(employee, persisted);
  const idx = db.employees.findIndex((e) => e.id === employee.id);
  if (idx >= 0) db.employees[idx] = employee;
  db.movements = db.employees.flatMap((e) => e.movements);
  if (!usesSupabaseDb()) await saveDb(db);
  await logMutation({
    action: "modification",
    entityType: "mouvement",
    entityId: `${employeeId}:${movementId}`,
    entityLabel: `${employee.prenom} ${employee.nom}`.trim(),
    summary: `Modification mouvement — ${employee.matricule}`,
    payloadBefore: snapshot({
      employeeId,
      movement: beforeMovement,
      employee: beforeEmployee,
    }),
    payloadAfter: snapshot({ employeeId, movement: updated, employee }),
  });
  return updated;
}

export async function deleteMovement(employeeId: string, movementId: string): Promise<boolean> {
  return runSerialized(() => deleteMovementInner(employeeId, movementId));
}

async function deleteMovementInner(employeeId: string, movementId: string): Promise<boolean> {
  const db = await ensureDb();
  const employee = await ensureEmployeeInDb(db, employeeId);
  if (!employee) return false;
  const beforeCount = employee.movements.length;
  const removed = employee.movements.find((m) => m.id === movementId);
  const beforeEmployee = removed
    ? snapshot({ ...employee, movements: [...employee.movements] })
    : null;
  employee.movements = employee.movements.filter((m) => m.id !== movementId);
  if (employee.movements.length === beforeCount) return false;

  employee.updatedAt = new Date().toISOString();
  const ctx = await buildMovementPersistContext(db, employeeId);
  const latest = latestMovement(employee.movements) ?? removed;
  const persisted = await persistEmployeeMovementsJson(
    db,
    employee,
    ctx,
    null,
    latest ?? {
      id: movementId,
      employeeId,
      type: "changement_poste",
      date: new Date().toISOString().slice(0, 10),
      effectiveDate: new Date().toISOString().slice(0, 10),
      reason: "",
      createdBy: null,
    }
  );
  Object.assign(employee, persisted);
  const idx = db.employees.findIndex((e) => e.id === employee.id);
  if (idx >= 0) db.employees[idx] = employee;
  db.movements = db.employees.flatMap((e) => e.movements);
  if (!usesSupabaseDb()) await saveDb(db);
  if (removed) {
    await logMutation({
      action: "suppression",
      entityType: "mouvement",
      entityId: `${employeeId}:${movementId}`,
      entityLabel: `${employee.prenom} ${employee.nom}`.trim(),
      summary: `Suppression mouvement ${removed.type} — ${employee.matricule}`,
      payloadBefore: snapshot({
        employeeId,
        movement: removed,
        employee: beforeEmployee,
      }),
      payloadAfter: snapshot({ employeeId, employee }),
    });
  }
  return true;
}

export async function listFamilyForEmployee(employeeId: string): Promise<FamilyMember[]> {
  const db = await ensureDb();
  const employee = await ensureEmployeeFamilySynced(db, employeeId);
  return employee?.family ?? [];
}

async function persistOvertimeMonthlyRecords(
  db: Database,
  employeeId: string,
  records: OvertimeMonthlyRecord[]
): Promise<OvertimeMonthlyRecord[]> {
  const employee = await ensureEmployeeInDb(db, employeeId);
  if (!employee) return [];

  const sorted = [...records].sort((a, b) => b.moisAnnee.localeCompare(a.moisAnnee));
  if (usesSupabaseDb() && /^\d+$/.test(employeeId)) {
    const row = await getEmployeById(employeeId);
    const parsed = parseEmployeMouvementJson(row?.mouvement);
    await updateEmployeMouvementJson(employeeId, {
      ...parsed,
      heures_sup_mensuelles: overtimeRecordsToMouvementEntries(sorted),
    });
  }

  const updated = normalizeEmployee({
    ...employee,
    overtimeMonthlyRecords: sorted,
    overtime: sorted[0]
      ? {
          hours130: sorted[0].hours130,
          hours160: sorted[0].hours160,
          hours200: sorted[0].hours200,
        }
      : employee.overtime,
    updatedAt: new Date().toISOString(),
  });
  syncEmployeeFamilyInDb(db, updated);
  if (!usesSupabaseDb()) await saveDb(db);
  return sorted;
}

export async function listOvertimeMonthlyForEmployee(
  employeeId: string
): Promise<OvertimeMonthlyRecord[]> {
  const employee = await getEmployee(employeeId);
  return employee?.overtimeMonthlyRecords ?? [];
}

export async function saveOvertimeMonthlyRecord(
  employeeId: string,
  input: Omit<OvertimeMonthlyRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<OvertimeMonthlyRecord | null> {
  return runSerialized(() => saveOvertimeMonthlyRecordInner(employeeId, input));
}

async function saveOvertimeMonthlyRecordInner(
  employeeId: string,
  input: Omit<OvertimeMonthlyRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<OvertimeMonthlyRecord | null> {
  const db = await ensureDb();
  const employee = await ensureEmployeeInDb(db, employeeId);
  if (!employee) return null;

  const now = new Date().toISOString();
  const records = [...(employee.overtimeMonthlyRecords ?? [])];
  const duplicate = records.find(
    (r) => r.moisAnnee === input.moisAnnee && r.id !== input.id
  );
  if (duplicate && !input.id) {
    throw new Error(`Des heures sup. existent déjà pour ${input.moisAnnee}.`);
  }

  let saved: OvertimeMonthlyRecord;
  if (input.id) {
    const idx = records.findIndex((r) => r.id === input.id);
    if (idx < 0) return null;
    saved = {
      ...records[idx]!,
      ...input,
      id: input.id,
      updatedAt: now,
    };
    records[idx] = saved;
  } else {
    saved = {
      id: crypto.randomUUID(),
      moisAnnee: input.moisAnnee,
      hours130: input.hours130,
      hours160: input.hours160,
      hours200: input.hours200,
      workMonthMode: input.workMonthMode,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
    records.push(saved);
  }

  const persisted = await persistOvertimeMonthlyRecords(db, employeeId, records);
  const hit = persisted.find((r) => r.id === saved.id) ?? saved;
  await logMutation({
    action: input.id ? "modification" : "insertion",
    entityType: "employe",
    entityId: `${employeeId}:overtime:${hit.id}`,
    entityLabel: `${employee.prenom} ${employee.nom}`.trim(),
    summary: `${input.id ? "Modification" : "Ajout"} heures sup. ${hit.moisAnnee} — ${employee.matricule}`,
    payloadAfter: snapshot({ employeeId, record: hit }),
  });
  return hit;
}

export async function deleteOvertimeMonthlyRecord(
  employeeId: string,
  recordId: string
): Promise<boolean> {
  return runSerialized(() => deleteOvertimeMonthlyRecordInner(employeeId, recordId));
}

async function deleteOvertimeMonthlyRecordInner(
  employeeId: string,
  recordId: string
): Promise<boolean> {
  const db = await ensureDb();
  const employee = await ensureEmployeeInDb(db, employeeId);
  if (!employee) return false;

  const removed = employee.overtimeMonthlyRecords?.find((r) => r.id === recordId);
  const next = (employee.overtimeMonthlyRecords ?? []).filter((r) => r.id !== recordId);
  if (next.length === (employee.overtimeMonthlyRecords?.length ?? 0)) return false;

  await persistOvertimeMonthlyRecords(db, employeeId, next);
  if (removed) {
    await logMutation({
      action: "suppression",
      entityType: "employe",
      entityId: `${employeeId}:overtime:${recordId}`,
      entityLabel: `${employee.prenom} ${employee.nom}`.trim(),
      summary: `Suppression heures sup. ${removed.moisAnnee} — ${employee.matricule}`,
      payloadBefore: snapshot({ employeeId, record: removed }),
      payloadAfter: null,
    });
  }
  return true;
}

export async function saveFamilyMember(
  employeeId: string,
  member: Omit<FamilyMember, "id"> & { id?: string }
): Promise<FamilyMember | null> {
  return runSerialized(() => saveFamilyMemberInner(employeeId, member));
}

async function saveFamilyMemberInner(
  employeeId: string,
  member: Omit<FamilyMember, "id"> & { id?: string }
): Promise<FamilyMember | null> {
  const db = await ensureDb();
  const employee = await ensureEmployeeFamilySynced(db, employeeId);
  if (!employee) return null;

  let saved: FamilyMember;

  if (usesSupabaseDb()) {
    if (member.id && /^\d+$/.test(member.id)) {
      const row = await updateFamilleMemberInDb(
        member.id,
        member as FamilyMember,
        null
      );
      saved = rowToFamilyMember(row);
    } else {
      const row = await createFamilleMember({
        matricule_employe: employee.matricule,
        member: member as Omit<FamilyMember, "id">,
      });
      saved = rowToFamilyMember(row);
    }
    const family = (await listFamilleByMatricule(employee.matricule)).map(rowToFamilyMember);
    employee.family = family;
  } else {
    saved = {
      ...(member as FamilyMember),
      id: member.id ?? crypto.randomUUID(),
    };
    employee.family = applyFamilyUniqueConstraints(employee.family ?? [], saved);
  }

  employee.childrenCount = employee.family.filter((m) => m.relation === "enfant").length;
  employee.updatedAt = new Date().toISOString();
  syncEmployeeFamilyInDb(db, employee);
  if (!usesSupabaseDb()) await saveDb(db);
  await logMutation({
    action: member.id ? "modification" : "insertion",
    entityType: "employe",
    entityId: `${employeeId}:${saved.id}`,
    entityLabel: `${employee.prenom} ${employee.nom}`.trim(),
    summary: `${member.id ? "Modification" : "Ajout"} membre famille — ${employee.matricule}`,
    payloadAfter: snapshot({ employeeId, member: saved, employee }),
  });
  return saved;
}

export async function updateFamilyMember(
  employeeId: string,
  memberId: string,
  member: FamilyMember
): Promise<FamilyMember | null> {
  return runSerialized(() => updateFamilyMemberInner(employeeId, memberId, member));
}

async function updateFamilyMemberInner(
  employeeId: string,
  memberId: string,
  member: FamilyMember
): Promise<FamilyMember | null> {
  const db = await ensureDb();
  const employee = await ensureEmployeeFamilySynced(db, employeeId);
  if (!employee) return null;
  const beforeMember = employee.family?.find((m) => m.id === memberId) ?? null;

  let updated: FamilyMember;
  if (usesSupabaseDb() && /^\d+$/.test(memberId)) {
    const row = await updateFamilleMemberInDb(memberId, { ...member, id: memberId }, null);
    updated = rowToFamilyMember(row);
    employee.family = (await listFamilleByMatricule(employee.matricule)).map(rowToFamilyMember);
  } else {
    updated = { ...member, id: memberId };
    employee.family = applyFamilyUniqueConstraints(employee.family ?? [], updated);
  }

  employee.childrenCount = employee.family.filter((m) => m.relation === "enfant").length;
  employee.updatedAt = new Date().toISOString();
  syncEmployeeFamilyInDb(db, employee);
  if (!usesSupabaseDb()) await saveDb(db);
  await logMutation({
    action: "modification",
    entityType: "employe",
    entityId: `${employeeId}:${memberId}`,
    entityLabel: `${employee.prenom} ${employee.nom}`.trim(),
    summary: `Modification membre famille — ${employee.matricule}`,
    payloadBefore: beforeMember ? snapshot({ employeeId, member: beforeMember }) : null,
    payloadAfter: snapshot({ employeeId, member: updated, employee }),
  });
  return updated;
}

export async function deleteFamilyMember(
  employeeId: string,
  memberId: string
): Promise<boolean> {
  return runSerialized(() => deleteFamilyMemberInner(employeeId, memberId));
}

async function deleteFamilyMemberInner(employeeId: string, memberId: string): Promise<boolean> {
  const db = await ensureDb();
  const employee = await ensureEmployeeFamilySynced(db, employeeId);
  if (!employee) return false;
  const removed = employee.family?.find((m) => m.id === memberId);

  if (usesSupabaseDb() && /^\d+$/.test(memberId)) {
    const deleted = await deleteFamilleMemberInDb(memberId);
    if (!deleted && !removed) return false;
    employee.family = (await listFamilleByMatricule(employee.matricule)).map(rowToFamilyMember);
  } else {
    const beforeCount = employee.family?.length ?? 0;
    employee.family = (employee.family ?? []).filter((m) => m.id !== memberId);
    if (employee.family.length === beforeCount) return false;
  }

  employee.childrenCount = employee.family.filter((m) => m.relation === "enfant").length;
  employee.updatedAt = new Date().toISOString();
  syncEmployeeFamilyInDb(db, employee);
  if (!usesSupabaseDb()) await saveDb(db);
  if (removed) {
    await logMutation({
      action: "suppression",
      entityType: "employe",
      entityId: `${employeeId}:${memberId}`,
      entityLabel: `${employee.prenom} ${employee.nom}`.trim(),
      summary: `Suppression membre famille — ${employee.matricule}`,
      payloadBefore: snapshot({ employeeId, member: removed, employee }),
      payloadAfter: null,
    });
  }
  return true;
}

export async function computeSettingsRevision(): Promise<string> {
  if (usesSupabaseDb()) {
    try {
      const rows = await listConfigurations();
      if (rows.length > 0) {
        const maxUpdated = rows.reduce(
          (best, row) => (row.updated_at > best ? row.updated_at : best),
          rows[0].updated_at
        );
        return `db:${maxUpdated}`;
      }
    } catch {
      /* table absente */
    }
  }
  const db = await ensureDb();
  return db.settingsRevision ? `local:${db.settingsRevision}` : `local:${db.settings.exchangeRate}`;
}

export async function getSettings(): Promise<AppSettings> {
  const { settings } = await getSettingsBundle();
  return settings;
}

export async function getSettingsBundle(): Promise<{
  settings: AppSettings;
  revision: string;
}> {
  const db = await ensureDb();
  let base = db.settings;

  if (usesSupabaseDb()) {
    try {
      const rows = await listConfigurations();
      if (rows.length > 0) {
        base = { ...base, ...mergeConfigurationParamsFromRows(rows) };
        const centresRow = rows.find((r) => r.titre_config === "Centres de coûts");
        if (centresRow?.params) {
          base = {
            ...base,
            centresCouts: parseCentresCoutsFromParams(
              centresRow.params as Record<string, unknown>
            ),
          };
        }
      }
    } catch {
      /* fallback cache local si table absente ou erreur réseau */
    }
  }

  const settings = mergeSettings(base);
  settings.departments = departementLabels(await getDepartements(), true);
  const { syncInppRateInSettings } = await import("./inpp-rate");
  const employees = await getEmployees();
  const synced = syncInppRateInSettings(settings, employees);
  const revision = await computeSettingsRevision();
  return { settings: synced, revision };
}

function touchLocalSettingsRevision(db: Database): void {
  db.settingsRevision = new Date().toISOString();
}

/** Enregistre une section Configuration (upsert `public.configuration` + cache local). */
export async function saveConfigurationSection(
  sectionId: ConfigurationSectionId,
  params: Partial<AppSettings>,
  updatedBy?: string | null
): Promise<AppSettings> {
  const titre = configurationTitreForSection(sectionId);
  let payload = { ...params } as Record<string, unknown>;

  if (usesSupabaseDb()) {
    const existing = await getConfigurationByTitre(titre);
    if (existing?.params && typeof existing.params === "object" && !Array.isArray(existing.params)) {
      payload = { ...(existing.params as Record<string, unknown>), ...payload };
    }
  }

  if (sectionId === "entreprise") {
    payload = normalizeEntrepriseSectionParams(payload as Partial<AppSettings>);
  }

  if (usesSupabaseDb()) {
    await upsertConfiguration(titre, payload, updatedBy);
  }

  const db = await ensureDb();
  const patch =
    sectionId === "entreprise"
      ? (payload as Partial<AppSettings>)
      : usesSupabaseDb()
        ? (({ departments: _d, ...rest }) => rest)(params)
        : params;
  const before = snapshot(db.settings);
  db.settings = mergeSettings({ ...db.settings, ...patch });
  touchLocalSettingsRevision(db);
  await saveDb(db);
  const after = await getSettings();
  await logMutation({
    action: "modification",
    entityType: "configuration",
    entityId: sectionId,
    entityLabel: titre,
    summary: `Modification configuration — ${titre}`,
    payloadBefore: { sectionId, settings: before },
    payloadAfter: { sectionId, settings: snapshot(after) },
  });
  return after;
}

/** Enregistre toutes les sections à partir de l'état AppSettings complet. */
export async function saveAllConfigurationSections(
  settings: AppSettings,
  updatedBy?: string | null
): Promise<AppSettings> {
  const db = await ensureDb();

  for (const section of CONFIGURATION_SECTIONS) {
    let params = extractConfigurationSectionParams(section.id, settings);
    if (section.id === "departements") {
      params.departments = departementLabels(await getDepartements(), true);
    }
    if (section.id === "entreprise") {
      params = normalizeEntrepriseSectionParams(settings) as Partial<AppSettings>;
    }
    if (usesSupabaseDb()) {
      await upsertConfiguration(
        configurationTitreForSection(section.id),
        params as Record<string, unknown>,
        updatedBy
      );
    }
  }

  const patch = usesSupabaseDb()
    ? (({ departments: _d, ...rest }) => rest)(settings)
    : settings;
  db.settings = mergeSettings({ ...db.settings, ...patch });
  touchLocalSettingsRevision(db);
  await saveDb(db);
  return getSettings();
}

export async function updateSettings(
  settings: Partial<AppSettings>
): Promise<AppSettings> {
  const db = await ensureDb();
  const before = snapshot(db.settings);
  const patch = usesSupabaseDb()
    ? (({ departments: _d, ...rest }) => rest)(settings)
    : settings;
  db.settings = mergeSettings({ ...db.settings, ...patch });
  touchLocalSettingsRevision(db);
  await saveDb(db);
  if (usesSupabaseDb()) {
    const merged = mergeSettings({ ...db.settings, ...patch });
    await saveAllConfigurationSections(merged, undefined);
  }
  const after = await getSettings();
  await logMutation({
    action: "modification",
    entityType: "configuration",
    entityId: "settings",
    entityLabel: "Paramètres",
    summary: "Modification des paramètres généraux",
    payloadBefore: { settings: before },
    payloadAfter: { settings: snapshot(after) },
  });
  return after;
}

export async function getDepartements(): Promise<Departement[]> {
  if (usesSupabaseDb()) {
    return listDepartementsFromDb();
  }
  const db = await ensureDb();
  return departementsFromSettings(db.settings.departments);
}

export async function getDepartement(id: string): Promise<Departement | null> {
  const departements = await getDepartements();
  return departements.find((d) => d.id === id) ?? null;
}

export async function createDepartement(
  partial: Omit<Departement, "id" | "createdAt" | "updatedAt"> & { code?: string }
): Promise<Departement> {
  const created = usesSupabaseDb()
    ? await createDepartementInDb(partial)
    : await (async () => {
        const db = await ensureDb();
        const labels = [...db.settings.departments, partial.libelle];
        persistDepartementLabels(db, labels);
        await saveDb(db);
        return departementsFromSettings(labels).at(-1)!;
      })();

  await logMutation({
    action: "insertion",
    entityType: "departement",
    entityId: created.id,
    entityLabel: created.libelle,
    summary: `Création département « ${created.libelle} »`,
    payloadAfter: snapshot(created),
  });
  return created;
}

export async function saveDepartement(departement: Departement): Promise<Departement> {
  const before = await getDepartement(departement.id);
  const saved = usesSupabaseDb()
    ? await updateDepartementInDb(departement)
    : await (async () => {
        const db = await ensureDb();
        const index = Number(departement.id.replace("local-", ""));
        const labels = [...db.settings.departments];
        if (Number.isInteger(index) && index >= 0 && index < labels.length) {
          labels[index] = departement.libelle;
        }
        persistDepartementLabels(db, labels);
        await saveDb(db);
        return (await getDepartement(departement.id)) ?? departement;
      })();

  await logMutation({
    action: "modification",
    entityType: "departement",
    entityId: saved.id,
    entityLabel: saved.libelle,
    summary: `Modification département « ${saved.libelle} »`,
    payloadBefore: before ? snapshot(before) : null,
    payloadAfter: snapshot(saved),
  });
  return saved;
}

export async function deleteDepartement(id: string): Promise<boolean> {
  const existing = await getDepartement(id);
  const ok = usesSupabaseDb()
    ? await deleteDepartementInDb(id)
    : await (async () => {
        const db = await ensureDb();
        const index = Number(id.replace("local-", ""));
        if (!Number.isInteger(index) || index < 0 || index >= db.settings.departments.length) {
          return false;
        }
        const labels = db.settings.departments.filter((_, i) => i !== index);
        persistDepartementLabels(db, labels);
        await saveDb(db);
        return true;
      })();

  if (ok && existing) {
    await logMutation({
      action: "suppression",
      entityType: "departement",
      entityId: existing.id,
      entityLabel: existing.libelle,
      summary: `Suppression département « ${existing.libelle} »`,
      payloadBefore: snapshot(existing),
      payloadAfter: null,
    });
  }
  return ok;
}

export async function getCentreDesCouts(): Promise<CentreDesCouts[]> {
  const settings = await getSettings();
  return settings.centresCouts ?? [];
}

export async function getCentreDesCoutsItem(id: string): Promise<CentreDesCouts | null> {
  const items = await getCentreDesCouts();
  return items.find((item) => item.id === id) ?? null;
}

function nextPositionCode(db: Database, department: string): string {
  const prefix = department.slice(0, 4).toUpperCase().replace(/\s/g, "");
  const codePrefix = `POSTE-${prefix}-`;
  let max = 0;
  for (const p of db.positions) {
    if (!p.code.startsWith(codePrefix)) continue;
    const match = p.code.match(/-(\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${codePrefix}${String(max + 1).padStart(4, "0")}`;
}

async function syncPositionAssignmentInner(
  db: Database,
  position: JobPosition,
  ctx?: Pick<MovementPersistContext, "employeesLite" | "positions" | "posteRows">
): Promise<void> {
  const employees = ctx?.employeesLite ?? (await employeesForPostesLinkingLite(db));
  let posteRows = ctx?.posteRows;
  const positions = ctx?.positions ?? db.positions;

  if (usesSupabasePostes()) {
    for (const p of positions) {
      if (p.id !== position.id && position.employeeId && p.employeeId === position.employeeId) {
        const cleared = {
          ...p,
          employeeId: null,
          status: p.status === "archived" ? "archived" : "vacant",
        } as JobPosition;
        const result = await updatePosteCached(cleared, employees, posteRows);
        posteRows = result.rows;
      }
    }
  } else {
    for (const p of db.positions) {
      if (p.id !== position.id && position.employeeId && p.employeeId === position.employeeId) {
        p.employeeId = null;
        p.status = p.status === "archived" ? "archived" : "vacant";
        p.updatedAt = new Date().toISOString();
      }
    }
  }

  const emp = position.employeeId
    ? employees.find((e) => e.id === position.employeeId) ??
      db.employees.find((e) => e.id === position.employeeId)
    : null;
  if (!emp) return;

  const prevPostId = emp.positionId;
  const payroll = {
    ...position.payroll,
    dependents: countChargeDependents(emp.family),
  };
  const assigned: JobPosition = {
    ...position,
    payroll,
    employeeId: position.employeeId,
    status: position.status === "vacant" ? "active" : position.status,
  };

  if (usesSupabasePostes()) {
    await updatePosteCached(assigned, employees, posteRows);
  } else {
    const posInDb = db.positions.find((p) => p.id === position.id);
    if (posInDb) {
      Object.assign(posInDb, assigned);
      posInDb.updatedAt = new Date().toISOString();
    }
  }

  emp.positionId = position.id;
  emp.position = position.title;
  emp.department = position.department;
  emp.grade = position.grade;
  emp.category = position.payroll.category;
  emp.salary = {
    baseSalary: position.payroll.baseSalary,
    currency: position.payroll.currency,
    category: position.payroll.category,
    allowances: position.payroll.allowances.map((a) => ({ ...a })),
  };
  if (prevPostId !== position.id) {
    emp.status = applyStatusAfterPositionAssignment(emp.status);
  }
  emp.updatedAt = new Date().toISOString();
}

function syncPositionAssignment(
  db: Database,
  position: JobPosition,
  ctx?: Pick<MovementPersistContext, "employeesLite" | "positions" | "posteRows">
): Promise<void> {
  return syncPositionAssignmentInner(db, position, ctx);
}

export async function getPositions(): Promise<JobPosition[]> {
  const db = await ensureDb();
  if (usesSupabasePostes()) {
    return listPostes(await employeesForPostesLinking(db));
  }
  return db.positions;
}

export async function getPosition(id: string): Promise<JobPosition | null> {
  const db = await ensureDb();
  if (usesSupabasePostes()) {
    const bundle = await loadPostesLinkingBundle(db);
    return getPosteById(id, bundle.employeesLite, bundle.posteRows);
  }
  return db.positions.find((p) => p.id === id) ?? null;
}

export async function getVacantPositions(): Promise<JobPosition[]> {
  const positions = await getPositions();
  return positions.filter(
    (p) => !p.employeeId && p.status !== "archived" && p.status !== "draft"
  );
}

export async function createPosition(
  partial: Omit<JobPosition, "id" | "code" | "createdAt" | "updatedAt"> & { code?: string }
): Promise<JobPosition> {
  const db = await ensureDb();
  let position: JobPosition;

  if (usesSupabasePostes()) {
    const employees = await employeesForPostesLinking(db);
    position = await createPoste(partial, employees);
    if (partial.employeeId) {
      await syncPositionAssignmentInner(db, { ...position, employeeId: partial.employeeId });
      await saveDb(db);
      position = (await getPosteById(position.id, employees)) ?? position;
    }
  } else {
    const now = new Date().toISOString();
    position = {
      ...partial,
      id: crypto.randomUUID(),
      code: partial.code ?? nextPositionCode(db, partial.department),
      employeeId: partial.employeeId ?? null,
      status: partial.employeeId ? partial.status === "draft" ? "draft" : "active" : "vacant",
      createdAt: now,
      updatedAt: now,
    };
    await syncPositionAssignmentInner(db, position);
    db.positions.push(position);
    await saveDb(db);
  }

  await logMutation({
    action: "insertion",
    entityType: "poste",
    entityId: position.id,
    entityLabel: position.title,
    summary: `Création poste « ${position.title} » (${position.code})`,
    payloadAfter: snapshot(position),
  });
  return position;
}

export async function savePosition(position: JobPosition): Promise<JobPosition> {
  const before = await getPosition(position.id);
  const db = await ensureDb();
  const normalized = normalizePositionStatus({
    ...position,
    updatedAt: new Date().toISOString(),
  });

  let saved: JobPosition;

  if (usesSupabasePostes()) {
    await syncPositionAssignmentInner(db, normalized);
    const employees = await employeesForPostesLinking(db);
    const updated = await updatePoste(normalized, employees);
    await saveDb(db);
    saved = (await getPosteById(updated.id, employees)) ?? updated;
  } else {
    const idx = db.positions.findIndex((p) => p.id === normalized.id);
    await syncPositionAssignmentInner(db, normalized);
    if (idx >= 0) {
      db.positions[idx] = normalized;
    } else {
      db.positions.push(normalized);
    }
    await saveDb(db);
    saved = normalized;
  }

  await logMutation({
    action: before ? "modification" : "insertion",
    entityType: "poste",
    entityId: saved.id,
    entityLabel: saved.title,
    summary: before
      ? `Modification poste « ${saved.title} » (${saved.code})`
      : `Création poste « ${saved.title} » (${saved.code})`,
    payloadBefore: before ? snapshot(before) : null,
    payloadAfter: snapshot(saved),
  });
  return saved;
}

export async function deletePosition(id: string): Promise<boolean> {
  const existing = await getPosition(id);
  const db = await ensureDb();

  if (usesSupabasePostes()) {
    const ok = await deletePoste(id);
    if (!ok) return false;
    for (const employee of db.employees) {
      if (employee.positionId === id) {
        employee.positionId = undefined;
        employee.updatedAt = new Date().toISOString();
      }
    }
    await saveDb(db);
  } else {
    const beforeCount = db.positions.length;
    db.positions = db.positions.filter((p) => p.id !== id);
    db.positions = db.positions.map((p) =>
      p.reportsToId === id ? { ...p, reportsToId: null, updatedAt: new Date().toISOString() } : p
    );
    if (db.positions.length === beforeCount) return false;
    await saveDb(db);
  }

  if (existing) {
    await logMutation({
      action: "suppression",
      entityType: "poste",
      entityId: existing.id,
      entityLabel: existing.title,
      summary: `Suppression poste « ${existing.title} » (${existing.code})`,
      payloadBefore: snapshot(existing),
      payloadAfter: null,
    });
  }
  return true;
}

export async function getPayslipTemplate(): Promise<PayslipTemplateConfig> {
  const db = await ensureDb();
  return normalizePayslipTemplate(db.payslipTemplate);
}

export async function savePayslipTemplate(
  template: PayslipTemplateConfig
): Promise<PayslipTemplateConfig> {
  return runSerialized(async () => {
    const db = await ensureDb();
    const before = snapshot(db.payslipTemplate);
    const normalized = normalizePayslipTemplate(template);
    db.payslipTemplate = normalized;
    await saveDb(db);
    await logMutation({
      action: "modification",
      entityType: "configuration",
      entityId: "payslip-template",
      entityLabel: "Modèle bulletin de paie",
      summary: "Modification du modèle de bulletin de paie",
      payloadBefore: { template: before },
      payloadAfter: { template: snapshot(normalized) },
    });
    return normalized;
  });
}

export async function archivePayslipsToDossiers(
  payslips: PayslipData[],
  htmlByEmployeeId: Record<string, string>
): Promise<{ archived: number; errors: string[] }> {
  return runSerialized(async () => {
    const db = await ensureDb();
    let archived = 0;
    const errors: string[] = [];
    const uploadRoot = path.join(process.cwd(), "public", "uploads");

    for (const slip of payslips) {
      try {
        const html = htmlByEmployeeId[slip.employeeId];
        if (!html) continue;

        const uploadDir = path.join(uploadRoot, slip.employeeId);
        await fs.mkdir(uploadDir, { recursive: true });
        const fileName = `bulletin-${slip.period}.html`;
        const storedName = `bulletin-${slip.period}-${Date.now()}.html`;
        await fs.writeFile(path.join(uploadDir, storedName), html, "utf-8");
        const fileRef = `/uploads/${slip.employeeId}/${storedName}`;

        const empIdx = db.employees.findIndex((e) => e.id === slip.employeeId);
        if (empIdx < 0) {
          errors.push(`Employé ${slip.employeeId} introuvable`);
          continue;
        }

        const emp = normalizeEmployee(db.employees[empIdx]);
        const docId = `bulletin-paie-${slip.period}`;
        const now = new Date().toISOString();
        const existingDoc = emp.documents.find((d) => d.id === docId);
        const doc = existingDoc
          ? {
              ...existingDoc,
              received: true,
              receivedAt: now,
              fileRef,
              fileName,
              uploadedAt: now,
              label: `Bulletin de paie — ${slip.periodLabel}`,
            }
          : {
              id: docId,
              label: `Bulletin de paie — ${slip.periodLabel}`,
              category: "paie" as const,
              required: false,
              received: true,
              receivedAt: now,
              fileRef,
              fileName,
              uploadedAt: now,
              legalRef: "Loi 015/2002 — bulletin de paie",
            };

        emp.documents = existingDoc
          ? emp.documents.map((d) => (d.id === docId ? doc : d))
          : [...emp.documents, doc];
        emp.updatedAt = now;
        db.employees[empIdx] = emp;

        const archiveRecord: PayslipArchiveRecord = {
          id: crypto.randomUUID(),
          employeeId: slip.employeeId,
          period: slip.period,
          generatedAt: slip.generatedAt,
          archivedAt: now,
          fileRef,
          fileName,
          netSalary: slip.payroll.netSalary,
          currency: slip.currency,
        };

        const prevArchive = (db.payslipArchives ?? []).findIndex(
          (a) => a.employeeId === slip.employeeId && a.period === slip.period
        );
        if (prevArchive >= 0) {
          db.payslipArchives![prevArchive] = archiveRecord;
        } else {
          db.payslipArchives!.push(archiveRecord);
        }
        archived += 1;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Erreur archivage");
      }
    }

    await saveDb(db);
    return { archived, errors };
  });
}

function enrichConges(
  records: LeaveRecord[],
  employees: Employee[]
): CongeWithEmployee[] {
  const byMatricule = new Map(employees.map((e) => [e.matricule, e]));
  return records.map((r) => {
    const emp = r.matriculeEmploye ? byMatricule.get(r.matriculeEmploye) : undefined;
    return {
      ...r,
      matriculeEmploye: r.matriculeEmploye ?? emp?.matricule ?? "",
      employeeId: emp?.id,
      employeeName: emp ? `${emp.prenom} ${emp.nom}` : undefined,
      department: emp?.department,
    };
  });
}

export async function listCongesForEmployee(employeeId: string): Promise<LeaveRecord[]> {
  const payload = await getEmployeeCongesFromSoldeColumn(employeeId);
  if (payload) return payload.conges;
  const db = await ensureDb();
  const employee = await ensureEmployeeInDb(db, employeeId);
  if (!employee) return [];
  return employee.dossier?.leaveHistory ?? [];
}

export async function getEmployeeLeaveBalanceFromSolde(
  employeeId: string
): Promise<LeaveBalance | null> {
  const payload = await getEmployeeCongesFromSoldeColumn(employeeId);
  return payload?.leaveBalance ?? null;
}

export async function listAllConges(): Promise<CongeWithEmployee[]> {
  const employees = await getEmployees();
  if (usesSupabaseDb()) {
    const rows = await listEmployes();
    const records: LeaveRecord[] = [];
    for (const row of rows) {
      const congesPayload = parseEmployeConges(readEmployeCongesColumnRaw(row));
      if (isEmployeCongesEmpty(congesPayload)) {
        const embedded = parseEmbeddedCongesFromSoldeRaw(row.solde_conge);
        if (!isEmployeCongesEmpty(embedded)) {
          records.push(...listLeaveRecordsFromCongesPayload(embedded, row.matricule));
          continue;
        }
      }
      records.push(...listLeaveRecordsFromCongesPayload(congesPayload, row.matricule));
    }
    return enrichConges(records, employees);
  }
  const records = employees.flatMap((e) => e.dossier?.leaveHistory ?? []);
  return enrichConges(records, employees);
}

export type SaveCongeInput = {
  type: LeaveType;
  startDate: string;
  endDate: string;
  days?: number;
  status?: LeaveRequestStatus;
  notes?: string;
  validateur1?: string | null;
  validateur2?: string | null;
  validation1At?: string | null;
  validation2At?: string | null;
};

export async function saveCongeForEmployee(
  employeeId: string,
  input: SaveCongeInput & { id?: string }
): Promise<LeaveRecord | null> {
  return runSerialized(() => saveCongeForEmployeeInner(employeeId, input));
}

async function saveCongeForEmployeeInner(
  employeeId: string,
  input: SaveCongeInput & { id?: string }
): Promise<LeaveRecord | null> {
  const jours = input.days ?? countWorkingDays(input.startDate, input.endDate);
  const v1 = input.validateur1 ?? null;
  const v2 = input.validateur2 ?? null;
  const statut =
    input.status ??
    (input.id
      ? deriveCongeStatus(v1, v2, input.validation1At, input.validation2At)
      : "demande");
  const now = new Date().toISOString();

  const ctx = await loadEmployeLeaveContext(employeeId);
  if (ctx) {
    if (!ctx.solde) {
      throw new Error(
        "Solde congé non initialisé. Effectuez une affectation au poste pour ouvrir le droit aux congés."
      );
    }

    const existingList = listLeaveRecordsFromCongesPayload(ctx.congesPayload, ctx.row.matricule);
    const previous = input.id ? existingList.find((c) => c.id === input.id) ?? null : null;

    if (input.type === "annuel") {
      const reserved = sumAnnualLeaveTaken(
        existingList.filter((c) => c.id !== input.id),
        ctx.solde.reinit_le
      );
      const available = Math.max(0, ctx.solde.acquis - reserved);
      if (jours > available) {
        throw new Error(
          `Solde insuffisant : ${available} jour${available !== 1 ? "s" : ""} disponible${available !== 1 ? "s" : ""}.`
        );
      }
    }

    const saved: LeaveRecord = {
      id: input.id ?? crypto.randomUUID(),
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      days: jours,
      status: statut,
      notes: input.notes,
      validateur1: v1,
      validateur2: v2,
      validation1At: input.validation1At ?? previous?.validation1At ?? null,
      validation2At: input.validation2At ?? previous?.validation2At ?? null,
      matriculeEmploye: ctx.row.matricule,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };

    const nextConges = upsertCongeInPayload(ctx.congesPayload, saved, ctx.solde.annee);
    await persistLeaveChange(employeeId, ctx.solde, nextConges);
    await logCongeMutation(employeeId, saved, previous);
    return saved;
  }

  const db = await ensureDb();
  const employee = await ensureEmployeeInDb(db, employeeId);
  if (!employee) return null;

  const previous =
    input.id ? (employee.dossier?.leaveHistory ?? []).find((c) => c.id === input.id) ?? null : null;
  const saved: LeaveRecord = {
    id: input.id ?? crypto.randomUUID(),
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    days: jours,
    status: statut,
    notes: input.notes,
    validateur1: v1,
    validateur2: v2,
    validation1At: input.validation1At,
    validation2At: input.validation2At,
    matriculeEmploye: employee.matricule,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
  syncEmployeeLeaveHistory(employee, saved);
  const idx = db.employees.findIndex((e) => e.id === employeeId);
  if (idx >= 0) db.employees[idx] = employee;
  await saveDb(db);
  await logCongeMutation(employeeId, saved, previous);
  return saved;
}

async function logCongeMutation(
  employeeId: string,
  saved: LeaveRecord,
  previous: LeaveRecord | null
): Promise<void> {
  const employee = await getEmployee(employeeId);
  const label = employee ? `${employee.prenom} ${employee.nom}`.trim() : employeeId;
  await logMutation({
    action: previous ? "modification" : "insertion",
    entityType: "conge",
    entityId: saved.id,
    entityLabel: label,
    summary: `${previous ? "Modification" : "Demande"} congé ${saved.type} — ${label}`,
    payloadBefore: previous ? snapshot({ ...previous, employeeId }) : null,
    payloadAfter: snapshot({ ...saved, employeeId }),
  });
}

function syncEmployeeLeaveHistory(employee: Employee, saved: LeaveRecord) {
  const dossier = employee.dossier ?? {};
  const history = dossier.leaveHistory ?? [];
  const idx = history.findIndex((l) => l.id === saved.id);
  const next = idx >= 0 ? history.map((l) => (l.id === saved.id ? saved : l)) : [...history, saved];
  employee.dossier = { ...dossier, leaveHistory: next };
}

export async function updateCongeStatus(
  congeId: string,
  status: LeaveRequestStatus,
  notes?: string
): Promise<LeaveRecord | null> {
  return runSerialized(() => updateCongeStatusInner(congeId, status, notes));
}

async function updateCongeStatusInner(
  congeId: string,
  status: LeaveRequestStatus,
  notes?: string
): Promise<LeaveRecord | null> {
  const hit = await findCongeContext(congeId);
  if (hit) {
    return saveCongeForEmployeeInner(hit.employeeId, {
      id: congeId,
      type: hit.record.type,
      startDate: hit.record.startDate,
      endDate: hit.record.endDate,
      days: hit.record.days,
      status,
      notes: notes ?? hit.record.notes,
      validateur1: hit.record.validateur1,
      validateur2: hit.record.validateur2,
      validation1At: hit.record.validation1At,
      validation2At: hit.record.validation2At,
    });
  }
  const allBefore = await listAllConges();
  const previous = allBefore.find((c) => c.id === congeId) ?? null;
  if (!previous?.employeeId) return null;
  return saveCongeForEmployeeInner(previous.employeeId, {
    id: congeId,
    type: previous.type,
    startDate: previous.startDate,
    endDate: previous.endDate,
    days: previous.days,
    status,
    notes: notes ?? previous.notes,
    validateur1: previous.validateur1,
    validateur2: previous.validateur2,
    validation1At: previous.validation1At,
    validation2At: previous.validation2At,
  });
}

export async function validateCongeLevel(
  congeId: string,
  validatorUserId: string,
  level: 1 | 2
): Promise<LeaveRecord | null> {
  return runSerialized(() => validateCongeLevelInner(congeId, validatorUserId, level));
}

async function validateCongeLevelInner(
  congeId: string,
  validatorUserId: string,
  level: 1 | 2
): Promise<LeaveRecord | null> {
  const all = await listAllConges();
  const existing = all.find((c) => c.id === congeId);
  if (!existing?.employeeId) return null;

  if (level === 2) {
    const raw1 = toDbValidatorField(existing.validateur1, existing.validation1At);
    if (!isValidatorApproved(raw1)) {
      throw new Error("La validation niveau 2 requiert une validation niveau 1 signée.");
    }
  }

  const now = new Date().toISOString();
  let validateur1 = existing.validateur1 ?? null;
  let validateur2 = existing.validateur2 ?? null;
  let validation1At = existing.validation1At ?? null;
  let validation2At = existing.validation2At ?? null;
  if (level === 1) {
    validateur1 = validatorUserId;
    validation1At = now;
  } else {
    validateur2 = validatorUserId;
    validation2At = now;
  }
  const status = deriveCongeStatus(validateur1, validateur2);

  return saveCongeForEmployeeInner(existing.employeeId, {
    id: congeId,
    type: existing.type,
    startDate: existing.startDate,
    endDate: existing.endDate,
    days: existing.days,
    notes: existing.notes,
    validateur1,
    validateur2,
    validation1At,
    validation2At,
    status,
  });
}

export async function deleteConge(congeId: string): Promise<boolean> {
  return runSerialized(() => deleteCongeInner(congeId));
}

async function deleteCongeInner(congeId: string): Promise<boolean> {
  const hit = await findCongeContext(congeId);
  if (hit) {
    const nextConges = removeCongeFromPayload(hit.congesPayload, congeId);
    if (!nextConges) return false;
    await persistLeaveChange(hit.employeeId, hit.solde, nextConges);
    const emp = await getEmployee(hit.employeeId);
    const label = emp ? `${emp.prenom} ${emp.nom}`.trim() : hit.matricule;
    await logMutation({
      action: "suppression",
      entityType: "conge",
      entityId: congeId,
      entityLabel: label,
      summary: `Suppression congé ${hit.record.type} — ${label}`,
      payloadBefore: snapshot({ ...hit.record, employeeId: hit.employeeId }),
      payloadAfter: null,
    });
    return true;
  }
  const allBefore = await listAllConges();
  const previous = allBefore.find((c) => c.id === congeId) ?? null;
  if (!previous?.employeeId) return false;
  const db = await ensureDb();
  const employee = await ensureEmployeeInDb(db, previous.employeeId);
  if (!employee?.dossier?.leaveHistory) return false;
  const beforeCount = employee.dossier.leaveHistory.length;
  employee.dossier.leaveHistory = employee.dossier.leaveHistory.filter((l) => l.id !== congeId);
  if (employee.dossier.leaveHistory.length === beforeCount) return false;
  const idx = db.employees.findIndex((e) => e.id === previous.employeeId);
  if (idx >= 0) db.employees[idx] = employee;
  await saveDb(db);
  const label = previous.employeeName ?? `${employee.prenom} ${employee.nom}`.trim();
  await logMutation({
    action: "suppression",
    entityType: "conge",
    entityId: congeId,
    entityLabel: label,
    summary: `Suppression congé ${previous.type} — ${label}`,
    payloadBefore: snapshot(previous),
    payloadAfter: null,
  });
  return true;
}

async function listLocalUtilisateurs(): Promise<UtilisateurRecord[]> {
  const db = await ensureDb();
  return ensureLocalUtilisateurs(db).map((u) => ({
    ...u,
    permissions: resolvePermissions(u.username, u.permissions),
  }));
}

async function getLocalUtilisateurByUsername(username: string): Promise<UtilisateurRecord | null> {
  const rows = await listLocalUtilisateurs();
  return rows.find((u) => u.username.toLowerCase() === username.trim().toLowerCase()) ?? null;
}

async function getLocalUtilisateurById(id: string): Promise<UtilisateurRecord | null> {
  const rows = await listLocalUtilisateurs();
  return rows.find((u) => u.id === id) ?? null;
}

async function createLocalUtilisateur(
  input: {
    username: string;
    passeword: string;
    matriculAgent?: string | null;
    permissions?: import("./permissions").PermissionMatrix;
    actif?: boolean;
  },
  audit?: { createdBy?: string }
): Promise<Utilisateur> {
  const db = await ensureDb();
  const users = ensureLocalUtilisateurs(db);
  if (users.some((u) => u.username.toLowerCase() === input.username.trim().toLowerCase())) {
    throw new Error("Ce nom d'utilisateur existe déjà");
  }
  const now = new Date().toISOString();
  const nextId = String(
    users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1
  );
  const record: UtilisateurRecord = {
    id: nextId,
    username: input.username.trim(),
    passeword: input.passeword,
    matriculAgent: input.matriculAgent?.trim() || null,
    permissions: input.permissions ?? {},
    actif: input.actif !== false,
    createdAt: now,
    createdBy: audit?.createdBy ?? null,
    updatedAt: now,
    updatedBy: audit?.createdBy ?? null,
  };
  users.push(record);
  await saveDb(db);
  return stripUtilisateurPassword(record);
}

async function updateLocalUtilisateur(
  id: string,
  input: {
    username?: string;
    passeword?: string;
    matriculAgent?: string | null;
    permissions?: import("./permissions").PermissionMatrix;
    actif?: boolean;
  },
  audit?: { updatedBy?: string }
): Promise<Utilisateur> {
  const db = await ensureDb();
  const users = ensureLocalUtilisateurs(db);
  const index = users.findIndex((u) => u.id === id);
  if (index < 0) throw new Error("Utilisateur introuvable");
  const current = users[index];
  if (
    input.username &&
    users.some(
      (u) =>
        u.id !== id && u.username.toLowerCase() === input.username!.trim().toLowerCase()
    )
  ) {
    throw new Error("Ce nom d'utilisateur existe déjà");
  }
  const now = new Date().toISOString();
  const updated: UtilisateurRecord = {
    ...current,
    username: input.username?.trim() ?? current.username,
    passeword: input.passeword ?? current.passeword,
    matriculAgent:
      input.matriculAgent !== undefined
        ? input.matriculAgent?.trim() || null
        : current.matriculAgent,
    permissions: input.permissions ?? current.permissions,
    actif: input.actif !== undefined ? input.actif : current.actif,
    updatedAt: now,
    updatedBy: audit?.updatedBy ?? current.updatedBy,
  };
  users[index] = updated;
  await saveDb(db);
  return stripUtilisateurPassword(updated);
}

async function deleteLocalUtilisateur(id: string): Promise<void> {
  const db = await ensureDb();
  const users = ensureLocalUtilisateurs(db);
  const target = users.find((u) => u.id === id);
  if (!target) throw new Error("Utilisateur introuvable");
  if (target.username.toLowerCase() === "admin") {
    throw new Error("Le compte Admin ne peut pas être supprimé");
  }
  db.utilisateurs = users.filter((u) => u.id !== id);
  await saveDb(db);
}

registerUtilisateurLocalStore({
  listLocal: listLocalUtilisateurs,
  getByUsername: getLocalUtilisateurByUsername,
  getById: getLocalUtilisateurById,
  create: createLocalUtilisateur,
  update: updateLocalUtilisateur,
  remove: deleteLocalUtilisateur,
});

// ── Journal d'activité (mode local) ─────────────────────────────────────────

function localActivityCanUndo(entry: ActivityLogEntry): boolean {
  if (entry.undoneAt) return false;
  if (entry.action === "connexion" || entry.action === "annulation") return false;
  if (entry.action === "insertion") return Boolean(entry.entityId && entry.payloadAfter);
  if (
    entry.action === "modification" ||
    entry.action === "desactivation" ||
    entry.action === "activation"
  ) {
    return Boolean(entry.payloadBefore);
  }
  if (entry.action === "suppression") return Boolean(entry.payloadBefore);
  return false;
}

function ensureLocalActivityLogs(db: Database): ActivityLogEntry[] {
  if (!db.activityLogs) db.activityLogs = [];
  return db.activityLogs;
}

function nextLocalActivityLogId(logs: ActivityLogEntry[]): string {
  const max = logs.reduce((acc, row) => Math.max(acc, Number(row.id) || 0), 0);
  return String(max + 1);
}

export async function appendLocalActivityLog(
  input: Omit<ActivityLogEntry, "id" | "canUndo" | "createdAt">
): Promise<ActivityLogEntry> {
  const db = await ensureDb();
  const logs = ensureLocalActivityLogs(db);
  const entry: ActivityLogEntry = {
    ...input,
    id: nextLocalActivityLogId(logs),
    createdAt: new Date().toISOString(),
    canUndo: false,
  };
  entry.canUndo = localActivityCanUndo(entry);
  logs.unshift(entry);
  if (logs.length > 2000) logs.length = 2000;
  await saveDb(db);
  return entry;
}

export async function listLocalActivityLogs(
  filters: { utilisateur?: string; from?: string; to?: string; limit?: number } = {}
): Promise<ActivityLogEntry[]> {
  const db = await ensureDb();
  let logs = [...ensureLocalActivityLogs(db)];
  if (filters.utilisateur?.trim()) {
    const needle = filters.utilisateur.trim().toLowerCase();
    logs = logs.filter((l) => l.utilisateur?.toLowerCase() === needle);
  }
  if (filters.from) {
    const fromMs = Date.parse(filters.from);
    logs = logs.filter((l) => Date.parse(l.createdAt) >= fromMs);
  }
  if (filters.to) {
    const toMs = Date.parse(filters.to);
    logs = logs.filter((l) => Date.parse(l.createdAt) <= toMs);
  }
  const limit = filters.limit ?? 500;
  const { resolveActivityChanges } = await import("@/lib/activity-log-diff");
  return logs.slice(0, limit).map((entry) => ({
    ...entry,
    changes:
      entry.changes ??
      resolveActivityChanges({
        action: entry.action,
        entityType: entry.entityType,
        payloadBefore: entry.payloadBefore,
        payloadAfter: entry.payloadAfter,
      }),
    canUndo: localActivityCanUndo(entry),
  }));
}

export async function getLocalActivityLogById(id: string): Promise<ActivityLogEntry | null> {
  const db = await ensureDb();
  return ensureLocalActivityLogs(db).find((l) => l.id === id) ?? null;
}

export async function markLocalActivityLogUndone(
  id: string,
  undoneBy: string
): Promise<ActivityLogEntry> {
  const db = await ensureDb();
  const logs = ensureLocalActivityLogs(db);
  const index = logs.findIndex((l) => l.id === id);
  if (index < 0) throw new Error("Entrée de journal introuvable");
  const updated: ActivityLogEntry = {
    ...logs[index],
    undoneAt: new Date().toISOString(),
    undoneBy,
    canUndo: false,
  };
  logs[index] = updated;
  await saveDb(db);
  return updated;
}

export async function deleteLocalActivityLog(id: string): Promise<boolean> {
  const db = await ensureDb();
  const logs = ensureLocalActivityLogs(db);
  const before = logs.length;
  db.activityLogs = logs.filter((l) => l.id !== id);
  if (db.activityLogs.length === before) return false;
  await saveDb(db);
  return true;
}

export async function listLocalActivityLogUsers(): Promise<string[]> {
  const db = await ensureDb();
  const names = new Set<string>();
  for (const row of ensureLocalActivityLogs(db)) {
    const name = row.utilisateur?.trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "fr"));
}
