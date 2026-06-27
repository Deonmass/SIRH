"use client";

import { useMemo } from "react";
import { PayrollDualTotalsCards } from "@/components/payroll/PayrollDualTotalsCards";
import { PayrollEmployeeMergeNoticeBanner } from "@/components/payroll/PayrollEmployeeMergeNotice";
import { PayrollSummaryCard } from "@/components/payroll/PayrollSummaryCard";
import { SalarySimulator } from "@/components/payroll/SalarySimulator";
import { useAppSettings } from "@/contexts/SettingsContext";
import { mergePayrollForEmployeePreview } from "@/lib/payroll-simulator-config";
import type { Employee, EmployeeExtraCosts, JobPositionPayroll } from "@/lib/types";

export function MouvementPayrollPreview({
  payrollConfig,
  employee,
  extraCosts,
  onExtraCostsChange,
  disabled = false,
}: {
  payrollConfig: JobPositionPayroll;
  employee?: Pick<Employee, "family" | "workMonthMode"> | null;
  extraCosts: EmployeeExtraCosts;
  onExtraCostsChange: (costs: EmployeeExtraCosts) => void;
  disabled?: boolean;
}) {
  const { settings } = useAppSettings();
  const currency = payrollConfig.currency;
  const { payroll: effectivePayroll, mergeNotice } = useMemo(
    () => mergePayrollForEmployeePreview(payrollConfig, employee, settings),
    [payrollConfig, employee, settings]
  );

  return (
    <div className="space-y-4">
      {mergeNotice ? <PayrollEmployeeMergeNoticeBanner notice={mergeNotice} /> : null}

      <SalarySimulator
        embedded
        readOnly
        stacked
        bulletinOnly
        settings={settings}
        params={settings}
        payrollConfig={effectivePayroll}
        employee={employee}
      />

      <PayrollSummaryCard
        title="Coûts extra"
        showBulletin={false}
        showGrandTotal={false}
        positionPayroll={effectivePayroll}
        extraCosts={extraCosts}
        currency={currency}
        editableExtras
        extrasDisabled={disabled}
        onExtraCostsChange={onExtraCostsChange}
      />

      <PayrollDualTotalsCards
        payrollConfig={effectivePayroll}
        extraCosts={extraCosts}
        currency={currency}
      />
    </div>
  );
}
