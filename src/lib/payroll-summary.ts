import { EXTRA_COST_FIELDS, totalExtraCosts } from "@/lib/extra-costs";
import { buildIrppDisplayLabel } from "@/lib/irpp-bareme";
import { calculatePayroll } from "@/lib/payroll";
import { jobPositionPayrollOptions, jobPositionToSalaryPackage } from "@/lib/postes";
import type {
  AppSettings,
  EmployeeExtraCosts,
  JobPositionPayroll,
  PayrollResult,
  SalaryPackage,
} from "@/lib/types";

export type PayrollSummaryLine = {
  label: string;
  value: number;
  variant?: "gain" | "deduction" | "total" | "info";
};

export function computePayrollFromSalary(
  salary: SalaryPackage,
  params: AppSettings,
  otherDeductions = 0,
  payroll?: JobPositionPayroll
): PayrollResult {
  const bareme = params.smigBareme ?? [];
  const options = payroll ? jobPositionPayrollOptions(payroll, bareme) : undefined;
  return calculatePayroll(salary, params, otherDeductions, options);
}

export function computePayrollFromPosition(
  positionPayroll: JobPositionPayroll,
  params: AppSettings
): PayrollResult {
  const salary = jobPositionToSalaryPackage(positionPayroll);
  return computePayrollFromSalary(
    salary,
    params,
    positionPayroll.otherDeductions ?? 0,
    positionPayroll
  );
}

export function buildPayslipSummaryLines(result: PayrollResult): PayrollSummaryLine[] {
  const imposable = result.totalRemunerationImposable ?? result.baseSalary;
  const totalGains = result.totalGains ?? result.grossSalary;
  const lines: PayrollSummaryLine[] = [
    { label: "Salaire brut (base)", value: result.baseSalary, variant: "gain" },
    {
      label: "Primes & indemnités contractuelles",
      value: result.allowancesTotal,
      variant: "gain",
    },
    {
      label: "Total rémunération imposable",
      value: imposable,
      variant: "total",
    },
    {
      label: "CNSS travailleur",
      value: -result.cnssEmployee,
      variant: "deduction",
    },
    {
      label: buildIrppDisplayLabel(result.iprAppliedRates, result.iprAbatementPercent),
      value: -result.ipr,
      variant: "deduction",
    },
  ];
  if (result.unionContribution) {
    lines.push({
      label: "Cotisation syndicale",
      value: -result.unionContribution,
      variant: "deduction",
    });
  }
  lines.push(
    {
      label: "Indemnité logement",
      value: result.housingAllowance ?? 0,
      variant: "gain",
    },
    {
      label: "Indemnité transport",
      value: result.transportAllowance ?? 0,
      variant: "gain",
    },
    { label: "Total gains", value: totalGains, variant: "total" },
    { label: "Net à payer (bulletin)", value: result.netSalary, variant: "total" }
  );
  return lines;
}

export function buildExtraCostLines(costs: EmployeeExtraCosts): PayrollSummaryLine[] {
  return [
    ...EXTRA_COST_FIELDS.map(({ field, label }) => ({
      label,
      value: costs[field],
      variant: "gain" as const,
    })),
    {
      label: "Total coûts extra",
      value: totalExtraCosts(costs),
      variant: "total" as const,
    },
  ];
}

export function grandTotalToPay(netSalary: number, extraCosts: EmployeeExtraCosts): number {
  return netSalary + totalExtraCosts(extraCosts);
}

/** Net à payer + retenues employé + charges employeur (aligné sur « COÛT TOTAL EMPLOYEUR » du bulletin). */
export function computeEmployerTotalCost(result: PayrollResult): number {
  return result.netSalary + result.totalEmployerCost;
}

export function grandTotalEmployerWithExtras(
  result: PayrollResult,
  extraCosts: EmployeeExtraCosts
): number {
  return computeEmployerTotalCost(result) + totalExtraCosts(extraCosts);
}
