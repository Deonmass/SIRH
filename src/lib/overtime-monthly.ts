import {
  findOvertimeRecordForMonth,
  overtimeRecordToEmployeeOvertime,
  totalOvertimeHours,
} from "@/lib/employes-overtime-json";
import { calculateOvertimePay, hourlyRateFromMonthlyBase, monthlyLegalHours } from "@/lib/payroll-rdc";
import { mergePayrollWithEmployeeDependents } from "@/lib/payroll-simulator-config";
import { resolveWorkMonthMode } from "@/lib/work-month-mode";
import type {
  AppSettings,
  Currency,
  Employee,
  JobPosition,
  JobPositionPayroll,
  OvertimeMonthlyRecord,
  WorkMonthMode,
} from "@/lib/types";

export type OvertimeMonthlyImpact = {
  moisAnnee: string;
  monthlyBase: number;
  currency: Currency;
  workMonthMode: WorkMonthMode;
  legalHours: number;
  hourlyRate: number;
  hours130: number;
  hours160: number;
  hours200: number;
  totalHours: number;
  overtimePay: number;
};

export function resolveMonthlyBaseForOvertime(
  employee: Employee,
  positionPayroll?: JobPositionPayroll | null
): { monthlyBase: number; currency: Currency } {
  const payroll = positionPayroll
    ? mergePayrollWithEmployeeDependents(positionPayroll, employee)
    : null;
  return {
    monthlyBase: payroll?.baseSalary ?? employee.salary.baseSalary,
    currency: payroll?.currency ?? employee.salary.currency,
  };
}

export function computeOvertimeMonthlyImpact(params: {
  employee: Employee;
  record: OvertimeMonthlyRecord;
  settings: AppSettings;
  positionPayroll?: JobPositionPayroll | null;
}): OvertimeMonthlyImpact {
  const { employee, record, settings, positionPayroll } = params;
  const { monthlyBase, currency } = resolveMonthlyBaseForOvertime(employee, positionPayroll);
  const workMonthMode =
    record.workMonthMode ?? resolveWorkMonthMode(employee, settings);
  const legalHours = monthlyLegalHours(workMonthMode);
  const hourlyRate = hourlyRateFromMonthlyBase(monthlyBase, workMonthMode);
  const overtime = overtimeRecordToEmployeeOvertime(record);
  const overtimePay = calculateOvertimePay(monthlyBase, overtime, workMonthMode);

  return {
    moisAnnee: record.moisAnnee,
    monthlyBase,
    currency,
    workMonthMode,
    legalHours,
    hourlyRate,
    hours130: record.hours130,
    hours160: record.hours160,
    hours200: record.hours200,
    totalHours: totalOvertimeHours(record),
    overtimePay,
  };
}

export function getOvertimeRecordForPayrollMonth(
  employee: Employee,
  moisAnnee: string
): OvertimeMonthlyRecord | null {
  return findOvertimeRecordForMonth(employee.overtimeMonthlyRecords, moisAnnee);
}

export function overtimeInputForPayrollMonth(
  employee: Employee,
  moisAnnee: string
): ReturnType<typeof overtimeRecordToEmployeeOvertime> | undefined {
  const record = getOvertimeRecordForPayrollMonth(employee, moisAnnee);
  if (!record || totalOvertimeHours(record) <= 0) return undefined;
  return overtimeRecordToEmployeeOvertime(record);
}

export function workMonthModeForPayrollMonth(
  employee: Employee,
  settings: AppSettings,
  moisAnnee: string
): WorkMonthMode {
  const record = getOvertimeRecordForPayrollMonth(employee, moisAnnee);
  return record?.workMonthMode ?? resolveWorkMonthMode(employee, settings);
}
