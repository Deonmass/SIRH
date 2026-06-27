import { totalExtraCosts } from "./extra-costs";
import { resolveEmployeeExtraCosts } from "./extra-costs-resolve";
import { calculatePayroll } from "./payroll";
import {
  computePayrollLikeSimulator,
  mergePayrollWithEmployeeDependents,
} from "./payroll-simulator-config";
import type { AppSettings, Currency, Employee, JobPosition } from "./types";

export function computeEmployeeTotalEmployeeCost(
  employee: Employee,
  settings: AppSettings,
  convertAmount: (amount: number, from: Currency, to: Currency) => number,
  position?: Pick<JobPosition, "payroll"> | null
): { netSalary: number; extrasTotal: number; totalEmployee: number; currency: Currency } {
  const extraCosts = resolveEmployeeExtraCosts(employee);
  const extrasTotal = totalExtraCosts(extraCosts);

  if (position?.payroll) {
    const payrollConfig = mergePayrollWithEmployeeDependents(position.payroll, employee);
    const result = computePayrollLikeSimulator(payrollConfig, settings, convertAmount);
    return {
      netSalary: result.netSalary,
      extrasTotal,
      totalEmployee: result.netSalary + extrasTotal,
      currency: payrollConfig.currency,
    };
  }

  const result = calculatePayroll(employee.salary, settings, 0, {
    dependents: employee.family.filter((m) => m.aCharge).length,
  });
  const currency = employee.salary.currency;
  return {
    netSalary: result.netSalary,
    extrasTotal,
    totalEmployee: result.netSalary + extrasTotal,
    currency,
  };
}
