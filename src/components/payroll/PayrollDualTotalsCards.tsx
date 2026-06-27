"use client";

import { useMemo } from "react";
import { useAppSettings } from "@/contexts/SettingsContext";
import { totalExtraCosts } from "@/lib/extra-costs";
import {
  computeEmployerTotalDisplayCost,
  computePayrollLikeSimulator,
} from "@/lib/payroll-simulator-config";
import type { Currency, EmployeeExtraCosts, JobPositionPayroll } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PayrollDualTotalsCards({
  payrollConfig,
  extraCosts,
  currency,
  compact = false,
}: {
  payrollConfig: JobPositionPayroll;
  extraCosts: EmployeeExtraCosts;
  currency?: Currency;
  compact?: boolean;
}) {
  const { settings, formatSalary, convertAmount } = useAppSettings();
  const displayCurrency = currency ?? payrollConfig.currency;

  const payrollTotals = useMemo(() => {
    const result = computePayrollLikeSimulator(payrollConfig, settings, convertAmount);
    const netSalary = result.netSalary;
    const employerTotalCost = computeEmployerTotalDisplayCost(result);
    const extrasTotal = totalExtraCosts(extraCosts);
    return {
      netSalary,
      employerTotalCost,
      extrasTotal,
      totalEmployee: netSalary + extrasTotal,
      totalEmployer: employerTotalCost + extrasTotal,
    };
  }, [payrollConfig, settings, extraCosts, convertAmount]);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div
        className={cn(
          "rounded-lg border border-sky-500/30 bg-sky-500/10",
          compact ? "px-2.5 py-2" : "px-3 py-3"
        )}
      >
        <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-sky-200/80">
          Total employé
        </p>
        <p
          className={cn(
            "mt-1 font-bold leading-tight text-sky-100 tabular-nums",
            compact ? "text-base" : "text-2xl"
          )}
        >
          {formatSalary(payrollTotals.totalEmployee, displayCurrency)}
        </p>
      </div>

      <div
        className={cn(
          "rounded-lg border border-amber-500/30 bg-amber-500/10",
          compact ? "px-2.5 py-2" : "px-3 py-3"
        )}
      >
        <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-amber-200/80">
          Total employeur
        </p>
        <p
          className={cn(
            "mt-1 font-bold leading-tight text-amber-300 tabular-nums",
            compact ? "text-base" : "text-2xl"
          )}
        >
          {formatSalary(payrollTotals.totalEmployer, displayCurrency)}
        </p>
      </div>
    </div>
  );
}
