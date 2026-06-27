import type { DbSoldeCongeJson } from "../../database/migrations/012_employes_solde_conge.types";
import { resolveEmployeeHireDate } from "@/lib/employee-seniority";
import { calculateAnnualLeave } from "@/lib/payroll";
import type {
  AppSettings,
  Employee,
  JobPosition,
  LeaveBalance,
  LeaveRecord,
  LeaveRequestStatus,
} from "@/lib/types";

export type CongeBalanceSettings = Pick<
  AppSettings,
  "annualLeaveDaysPerMonth" | "annualLeaveDaysPerMonthMinor" | "gradeLeaveDays"
>;
import { ageFromBirth, yearsOfService } from "@/lib/utils";

export type SoldeCongePayload = DbSoldeCongeJson;

const MOVEMENTS_INIT_SOLDE = new Set(["affectation", "embauche"]);

export function movementInitializesSoldeConge(type: string): boolean {
  return MOVEMENTS_INIT_SOLDE.has(type);
}

export function employeeQualifiesForSoldeInit(
  employee: Pick<Employee, "positionId" | "movements">
): boolean {
  return !!(
    employee.positionId ||
    employee.movements?.some((m) => movementInitializesSoldeConge(m.type))
  );
}

/** Date d'affectation / embauche pour initialiser le solde congé */
export function resolveAffectationEffectiveDate(
  employee: Pick<Employee, "hireDate" | "movements" | "positionId">
): string | null {
  const sorted = [...(employee.movements ?? [])].sort((a, b) =>
    (b.effectiveDate ?? b.date).localeCompare(a.effectiveDate ?? a.date)
  );
  const movement = sorted.find((m) => movementInitializesSoldeConge(m.type));
  if (movement) return movement.effectiveDate ?? movement.date;
  const hire = resolveEmployeeHireDate(employee);
  return hire ?? null;
}

export function parseSoldeConge(raw: string | null | undefined): SoldeCongePayload | null {
  if (!raw?.trim()) return null;
  try {
    const data = JSON.parse(raw) as Partial<SoldeCongePayload>;
    if (
      typeof data.acquis !== "number" ||
      typeof data.pris !== "number" ||
      typeof data.restant !== "number"
    ) {
      return null;
    }
    return {
      annee: data.annee ?? new Date().getFullYear(),
      acquis: data.acquis,
      pris: data.pris,
      restant: data.restant,
      reinit_le: data.reinit_le ?? new Date().toISOString().slice(0, 10),
      date_reference: data.date_reference ?? data.reinit_le ?? new Date().toISOString().slice(0, 10),
      grade: data.grade ?? null,
      categorie: data.categorie ?? null,
      bonus_anciennete: data.bonus_anciennete,
      jours_par_mois: data.jours_par_mois,
      source: data.source ?? "code_travail_art141",
    };
  } catch {
    return null;
  }
}

export function encodeSoldeConge(payload: SoldeCongePayload): string {
  return JSON.stringify(payload);
}

/** Statuts qui consomment le solde (demandes en cours incluses). */
const SOLDE_COUNTED_STATUSES = new Set<LeaveRequestStatus>([
  "demande",
  "validation_1",
  "validation_2",
  "approuve",
  "termine",
]);

export function leaveStatusCountsAgainstSolde(status: LeaveRequestStatus): boolean {
  return SOLDE_COUNTED_STATUSES.has(status);
}

type CongeSoldeSlice = Pick<LeaveRecord, "type" | "status" | "days" | "startDate" | "endDate">;

/** Congé annuel actif compté dans le solde de la période en cours (depuis `reinit_le`). */
export function congeCountsForSoldePeriod(
  conge: CongeSoldeSlice,
  periodStart?: string | null
): boolean {
  if (conge.type !== "annuel" || !leaveStatusCountsAgainstSolde(conge.status)) return false;
  if (!periodStart) return true;
  return conge.endDate >= periodStart;
}

/** Somme des jours annuels consommés / réservés sur la période de solde courante. */
export function sumAnnualLeaveTaken(
  conges: CongeSoldeSlice[],
  periodStart?: string | null
): number {
  return conges
    .filter((c) => congeCountsForSoldePeriod(c, periodStart))
    .reduce((sum, c) => sum + c.days, 0);
}

/** Recalcule `pris` / `restant` à partir des lignes `conges` (plafonné à `acquis`). */
export function reconcileSoldePris(
  solde: SoldeCongePayload,
  conges: CongeSoldeSlice[]
): SoldeCongePayload {
  const pris = Math.min(solde.acquis, sumAnnualLeaveTaken(conges, solde.reinit_le));
  const restant = Math.max(0, solde.acquis - pris);
  return { ...solde, pris, restant };
}

/** Solde utilisable (cohérent même si `restant` JSON est désynchronisé). */
export function effectiveLeaveRemaining(lb: LeaveBalance): number {
  return Math.max(0, Math.max(lb.remaining, lb.acquired - lb.taken));
}

export function soldeCongeToLeaveBalance(solde: SoldeCongePayload | null): LeaveBalance {
  if (!solde) {
    return { acquired: 0, taken: 0, remaining: 0 };
  }
  const remaining = Math.max(0, solde.acquis - solde.pris);
  return {
    acquired: solde.acquis,
    taken: solde.pris,
    remaining,
    reinitAt: solde.reinit_le,
    referenceDate: solde.date_reference,
    grade: solde.grade ?? undefined,
    category: solde.categorie ?? undefined,
    serviceYear: solde.annee,
  };
}

function serviceYearIndex(referenceDate: string, asOf = new Date()): number {
  const ref = new Date(`${referenceDate}T12:00:00`);
  let years = asOf.getFullYear() - ref.getFullYear();
  const anniversary = new Date(ref);
  anniversary.setFullYear(asOf.getFullYear());
  if (asOf < anniversary) years -= 1;
  return Math.max(0, years);
}

function lastServiceAnniversary(referenceDate: string, asOf = new Date()): string {
  const ref = new Date(`${referenceDate}T12:00:00`);
  const month = ref.getMonth();
  const day = ref.getDate();
  let year = asOf.getFullYear();
  const candidate = new Date(year, month, day, 12, 0, 0);
  if (asOf < candidate) year -= 1;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function resolveGradeAnnualLeaveDays(
  grade: string | null | undefined,
  settings?: CongeBalanceSettings
): number | null {
  if (!grade?.trim() || !settings?.gradeLeaveDays?.length) return null;
  const hit = settings.gradeLeaveDays.find((g) => g.grade === grade);
  return hit?.annualDays ?? null;
}

export function computeLeaveEntitlement(params: {
  employee: Pick<Employee, "dateNaissance" | "hireDate" | "movements">;
  effectiveDate: string;
  grade?: string | null;
  category?: number | null;
  positionAnnualLeaveDays?: number | null;
  settings?: CongeBalanceSettings;
}): {
  acquis: number;
  bonusSeniorite: number;
  daysPerMonth: number;
  eligible: boolean;
} {
  const referenceDate = params.effectiveDate;
  const years = yearsOfService(referenceDate);
  const age = params.employee.dateNaissance
    ? ageFromBirth(params.employee.dateNaissance) ?? 18
    : 18;

  const daysPerMonth =
    age < 18
      ? (params.settings?.annualLeaveDaysPerMonthMinor ?? 1.5)
      : (params.settings?.annualLeaveDaysPerMonth ?? 1);

  const legal = calculateAnnualLeave(age, years, 12);
  const gradeDays = resolveGradeAnnualLeaveDays(params.grade, params.settings);
  let acquis = gradeDays != null ? gradeDays + legal.seniorityBonus : legal.total;

  if (params.positionAnnualLeaveDays != null && params.positionAnnualLeaveDays > 0) {
    acquis = params.positionAnnualLeaveDays;
  }

  return {
    acquis,
    bonusSeniorite: legal.seniorityBonus,
    daysPerMonth,
    eligible: years >= 1 || serviceYearIndex(referenceDate) >= 1,
  };
}

export function buildSoldeCongeAtAffectation(params: {
  employee: Employee;
  effectiveDate: string;
  position?: JobPosition | null;
  settings?: CongeBalanceSettings;
  existing?: SoldeCongePayload | null;
}): SoldeCongePayload {
  const { employee, effectiveDate, position, settings, existing } = params;
  const referenceDate = resolveEmployeeHireDate(employee) ?? effectiveDate;
  const entitlement = computeLeaveEntitlement({
    employee: { ...employee, hireDate: referenceDate },
    effectiveDate: referenceDate,
    grade: position?.grade ?? employee.grade,
    category: position?.payroll.category ?? employee.category,
    positionAnnualLeaveDays: position?.payroll.daysAnnualLeave,
    settings,
  });

  const pris = existing?.pris ?? 0;
  const acquis = entitlement.acquis;
  const restant = Math.max(0, acquis - pris);

  return {
    annee: serviceYearIndex(referenceDate) + 1,
    acquis,
    pris,
    restant,
    reinit_le: effectiveDate,
    date_reference: referenceDate,
    grade: position?.grade ?? employee.grade ?? null,
    categorie: position?.payroll.category ?? employee.category ?? null,
    bonus_anciennete: entitlement.bonusSeniorite,
    jours_par_mois: entitlement.daysPerMonth,
    source: "affectation",
  };
}

export function renewSoldeCongeIfNeeded(params: {
  employee: Employee;
  solde: SoldeCongePayload;
  position?: JobPosition | null;
  settings?: CongeBalanceSettings;
  asOf?: Date;
}): { solde: SoldeCongePayload; changed: boolean } {
  const asOf = params.asOf ?? new Date();
  const referenceDate =
    params.solde.date_reference ||
    resolveEmployeeHireDate(params.employee) ||
    params.solde.reinit_le;
  const anniversary = lastServiceAnniversary(referenceDate, asOf);

  if (anniversary <= params.solde.reinit_le) {
    return { solde: params.solde, changed: false };
  }

  const entitlement = computeLeaveEntitlement({
    employee: params.employee,
    effectiveDate: referenceDate,
    grade: params.solde.grade ?? params.position?.grade,
    category: params.solde.categorie ?? params.position?.payroll.category,
    positionAnnualLeaveDays: params.position?.payroll.daysAnnualLeave,
    settings: params.settings,
  });

  const renewed: SoldeCongePayload = {
    annee: serviceYearIndex(referenceDate, asOf) + 1,
    acquis: entitlement.acquis,
    pris: 0,
    restant: entitlement.acquis,
    reinit_le: anniversary,
    date_reference: referenceDate,
    grade: params.solde.grade ?? params.position?.grade ?? null,
    categorie: params.solde.categorie ?? params.position?.payroll.category ?? null,
    bonus_anciennete: entitlement.bonusSeniorite,
    jours_par_mois: entitlement.daysPerMonth,
    source: "reinit_annuelle",
  };

  return { solde: renewed, changed: true };
}

/** Initialise `conges` vide si absent (format JSON employe). */
export function ensureSoldeCongesArray<T extends SoldeCongePayload>(solde: T): T & { conges: [] } {
  const ext = solde as T & { conges?: unknown[] };
  if (!Array.isArray(ext.conges)) {
    (ext as T & { conges: [] }).conges = [];
  }
  return ext as T & { conges: [] };
}

export function applyLeaveTakenToSolde(
  solde: SoldeCongePayload,
  days: number
): SoldeCongePayload {
  const pris = solde.pris + days;
  const restant = Math.max(0, solde.acquis - pris);
  return { ...solde, pris, restant };
}

export function releaseLeaveTakenFromSolde(
  solde: SoldeCongePayload,
  days: number
): SoldeCongePayload {
  const pris = Math.max(0, solde.pris - days);
  const restant = Math.max(0, solde.acquis - pris);
  return { ...solde, pris, restant };
}

export function employeeSoldeFromRow(
  row: { solde_conge?: string | null },
  employee: Employee
): SoldeCongePayload | null {
  return parseSoldeConge(row.solde_conge);
}
