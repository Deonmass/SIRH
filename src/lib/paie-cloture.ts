import { fromCdf, toCdf } from "@/lib/currency";
import {
  computePayrollLikeSimulator,
  DEFAULT_POINTAGE,
  initSimulatorFromPayroll,
  buildJobPositionPayrollFromSimulator,
  mergePayrollWithEmployeeDependents,
  rebuildPayrollConfigFromPositionDaily,
} from "@/lib/payroll-simulator-config";
import { DEFAULT_SMIG_BAREME, getSmigRowByGrade } from "@/lib/smig-bareme";
import type { DbPaiePayloadJson } from "../../database/migrations/021_paie_table.types";
import type { DbPointageSyntheseJson } from "../../database/migrations/019_pointage_table.types";
import { encodePaiePayload, payrollConfigToJson, payrollResultToJson, extraCostsToJson } from "@/lib/paie-utils";
import { parsePointagePayload, finalizePointageSynthese, syntheseToApp } from "@/lib/pointage-utils";
import { getPointageByMatriculeMois, upsertPointageInDb } from "@/lib/repositories/pointage";
import { getPaieByMatriculeMois, upsertPaieInDb } from "@/lib/repositories/paie";
import { resolveEmployeeExtraCosts } from "@/lib/extra-costs-resolve";
import { totalOvertimeHours } from "@/lib/employes-overtime-json";
import {
  getOvertimeRecordForPayrollMonth,
  overtimeInputForPayrollMonth,
} from "@/lib/overtime-monthly";
import { totalExtraCosts } from "@/lib/extra-costs";
import type {
  AppSettings,
  Currency,
  Employee,
  JobPosition,
  JobPositionPayroll,
  PointageSynthese,
} from "@/lib/types";
import { resolveWorkMonthMode } from "@/lib/work-month-mode";

export interface PaieClotureResult {
  matriculeEmploye: string;
  ok: boolean;
  error?: string;
  paieId?: string;
  netSalary?: number;
  currency?: Currency;
}

function convertAmount(settings: AppSettings) {
  return (amount: number, from: Currency, to: Currency) => {
    if (from === to) return amount;
    const cdf = toCdf(amount, from, settings.exchangeRate);
    return fromCdf(cdf, to, settings.exchangeRate);
  };
}

export function mergeSyntheseIntoPayroll(
  payroll: JobPositionPayroll,
  synthese: PointageSynthese | DbPointageSyntheseJson
): JobPositionPayroll {
  return {
    ...payroll,
    daysPresent: synthese.jours_prestes_paie,
    daysSick: synthese.jours_maladie_paie,
    daysAnnualLeave: synthese.jours_conge_paie,
    daysHoliday: synthese.jours_feries_paie,
  };
}

function fallbackPayrollFromEmployee(
  employee: Employee,
  synthese: PointageSynthese | DbPointageSyntheseJson,
  settings: AppSettings
): JobPositionPayroll {
  const bareme = settings.smigBareme?.length ? settings.smigBareme : DEFAULT_SMIG_BAREME;
  const convert = convertAmount(settings);
  const grade = employee.salary.category ?? 3;
  const row = getSmigRowByGrade(bareme, grade) ?? bareme[0];
  const init = initSimulatorFromPayroll(undefined, bareme, convert);
  return buildJobPositionPayrollFromSimulator(
    {
      ...init,
      currency: employee.salary.currency,
      smigGrade: grade,
      smigCategory: row.categoryLabel,
      dailyBaseCdf: row.dailyBaseSalary,
      transportDailyCdf: row.transportDaily,
      housingMonthlyCdf: row.housingAllowance,
      daysPresent: synthese.jours_prestes_paie,
      daysSick: synthese.jours_maladie_paie,
      daysAnnualLeave: synthese.jours_conge_paie,
      daysHoliday: synthese.jours_feries_paie,
      dependents: employee.family.filter((m) => m.aCharge).length,
      unionMember: false,
      otherDeductions: DEFAULT_POINTAGE.otherDeductions,
      allowances: employee.salary.allowances ?? [],
    },
    bareme,
    convert
  );
}

function resolvePayrollConfig(
  employee: Employee,
  position: JobPosition | undefined,
  synthese: PointageSynthese | DbPointageSyntheseJson,
  settings: AppSettings
): JobPositionPayroll {
  const bareme = settings.smigBareme?.length ? settings.smigBareme : DEFAULT_SMIG_BAREME;
  const convert = convertAmount(settings);

  if (!position?.payroll) {
    return fallbackPayrollFromEmployee(employee, synthese, settings);
  }

  const positionPayroll = mergePayrollWithEmployeeDependents(position.payroll, employee);
  return rebuildPayrollConfigFromPositionDaily(
    positionPayroll,
    {
      daysPresent: synthese.jours_prestes_paie,
      daysSick: synthese.jours_maladie_paie,
      daysAnnualLeave: synthese.jours_conge_paie,
      daysHoliday: synthese.jours_feries_paie,
    },
    bareme,
    convert
  );
}

export async function cloturerPaieEmploye(input: {
  employee: Employee;
  position?: JobPosition;
  moisAnnee: string;
  settings: AppSettings;
  createdBy?: string;
  force?: boolean;
}): Promise<PaieClotureResult> {
  const { employee, position, moisAnnee, settings, createdBy, force } = input;
  const matricule = employee.matricule;

  try {
    const existingPaie = await getPaieByMatriculeMois(matricule, moisAnnee);
    if (existingPaie && !force) {
      return {
        matriculeEmploye: matricule,
        ok: false,
        error: "Paie déjà clôturée pour ce mois",
      };
    }

    const pointageRow = await getPointageByMatriculeMois(matricule, moisAnnee);
    if (!pointageRow) {
      return { matriculeEmploye: matricule, ok: false, error: "Aucune feuille de pointage" };
    }

    const pointagePayload = parsePointagePayload(pointageRow.pointage);
    if (!pointagePayload.jours.length) {
      return { matriculeEmploye: matricule, ok: false, error: "Pointage non saisi" };
    }

    const synthese = syntheseToApp(
      finalizePointageSynthese(
        pointagePayload.jours,
        resolveWorkMonthMode(employee, settings)
      )
    );
    const payrollConfig = resolvePayrollConfig(employee, position, synthese, settings);
    const convert = convertAmount(settings);
    const bareme = settings.smigBareme?.length ? settings.smigBareme : DEFAULT_SMIG_BAREME;

    const overtimeInput = overtimeInputForPayrollMonth(employee, moisAnnee);
    const payrollResult = computePayrollLikeSimulator(
      payrollConfig,
      settings,
      convert,
      bareme,
      { overtime: overtimeInput }
    );

    const overtimeRecord = getOvertimeRecordForPayrollMonth(employee, moisAnnee);
    const heuresSup = overtimeRecord
      ? totalOvertimeHours(overtimeRecord)
      : (synthese.heures_sup_total ?? 0);

    const extraCostsRaw = resolveEmployeeExtraCosts(employee);
    const payrollCurrency = payrollResult.currency;
    const convertExtra = (amount: number, from: Currency) =>
      convert(amount, from, payrollCurrency);
    const extraCosts = {
      housing: convertExtra(extraCostsRaw.housing, extraCostsRaw.currency),
      mileage: convertExtra(extraCostsRaw.mileage, extraCostsRaw.currency),
      childrenEducation: convertExtra(extraCostsRaw.childrenEducation, extraCostsRaw.currency),
      travel: convertExtra(extraCostsRaw.travel, extraCostsRaw.currency),
      variables: convertExtra(extraCostsRaw.variables, extraCostsRaw.currency),
      currency: payrollCurrency,
    };
    const extraCostsTotal = totalExtraCosts(extraCosts);
    const totalAPayer = payrollResult.netSalary + extraCostsTotal;

    await upsertPointageInDb({
      matricul_employe: matricule,
      mois_annee: moisAnnee,
      jours: pointagePayload.jours,
      verrouille: true,
      commentaire_mois: pointagePayload.commentaire_mois,
    });

    const payload: DbPaiePayloadJson = {
      mois_annee: moisAnnee,
      statut: "cloture",
      source: "pointage",
      pointage_id: pointageRow.id,
      synthese,
      payroll_config: payrollConfigToJson(payrollConfig),
      payroll_result: payrollResultToJson(payrollResult),
      heures_sup: heuresSup,
      extra_costs: extraCostsToJson(extraCosts),
      extra_costs_total: extraCostsTotal,
      total_a_payer: totalAPayer,
      cloture_le: new Date().toISOString(),
      cloture_par: createdBy ?? null,
      commentaire: null,
    };

    const row = await upsertPaieInDb({
      matricul_employe: matricule,
      paie: encodePaiePayload(payload),
      created_by: createdBy,
      updated_by: createdBy,
    });

    return {
      matriculeEmploye: matricule,
      ok: true,
      paieId: String(row.id),
      netSalary: payrollResult.netSalary,
      currency: payrollResult.currency,
    };
  } catch (e) {
    return {
      matriculeEmploye: matricule,
      ok: false,
      error: e instanceof Error ? e.message : "Erreur clôture",
    };
  }
}

export async function cloturerPaieMois(input: {
  employees: Employee[];
  positions: JobPosition[];
  moisAnnee: string;
  settings: AppSettings;
  createdBy?: string;
  matricules?: string[];
}): Promise<{ results: PaieClotureResult[]; success: number; failed: number }> {
  const positionByEmployeeId = new Map(
    input.positions.filter((p) => p.employeeId).map((p) => [p.employeeId!, p])
  );

  const targets = input.matricules?.length
    ? input.employees.filter((e) => input.matricules!.includes(e.matricule))
    : input.employees.filter((e) => !["sorti", "licencie", "candidat"].includes(e.status));

  const results: PaieClotureResult[] = [];
  for (const emp of targets) {
    const position =
      (emp.positionId ? input.positions.find((p) => p.id === emp.positionId) : undefined) ??
      positionByEmployeeId.get(emp.id);
    results.push(
      await cloturerPaieEmploye({
        employee: emp,
        position,
        moisAnnee: input.moisAnnee,
        settings: input.settings,
        createdBy: input.createdBy,
      })
    );
  }

  return {
    results,
    success: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  };
}
