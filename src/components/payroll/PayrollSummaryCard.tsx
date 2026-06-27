"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { useAppSettings } from "@/contexts/SettingsContext";
import {
  EXTRA_COST_FIELDS,
  totalExtraCosts,
} from "@/lib/extra-costs";
import {
  buildExtraCostLines,
  buildPayslipSummaryLines,
  computePayrollFromPosition,
  computePayrollFromSalary,
  grandTotalToPay,
  type PayrollSummaryLine,
} from "@/lib/payroll-summary";
import type { Currency, EmployeeExtraCosts, JobPositionPayroll, SalaryPackage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PayrollSummaryCard({
  title = "Récapitulatif paie",
  salary,
  positionPayroll,
  extraCosts,
  currency,
  showExtras = true,
  showBulletin = true,
  showGrandTotal = true,
  showNetHighlight = false,
  editableExtras = false,
  onExtraCostsChange,
  extrasDisabled = false,
  /** Sans carte ni titre — déjà dans un panneau parent (dossier employé) */
  embedded = false,
  className,
}: {
  title?: string;
  salary?: SalaryPackage;
  positionPayroll?: JobPositionPayroll;
  extraCosts?: EmployeeExtraCosts;
  currency?: Currency;
  /** Affiche le détail des coûts extra dans la carte */
  showExtras?: boolean;
  /** Affiche les lignes du bulletin (désactivable si simulateur au-dessus) */
  showBulletin?: boolean;
  /** Grand total net + coûts extra */
  showGrandTotal?: boolean;
  /** Encadré « net à payer » (bulletin seul) */
  showNetHighlight?: boolean;
  /** Champs saisissables dans la zone coûts extra */
  editableExtras?: boolean;
  onExtraCostsChange?: (costs: EmployeeExtraCosts) => void;
  extrasDisabled?: boolean;
  embedded?: boolean;
  className?: string;
}) {
  const { formatSalary, settings } = useAppSettings();

  const { bulletinLines, extraLines, netSalary, extrasTotal, grandTotal, displayCurrency } =
    useMemo(() => {
      const result = positionPayroll
        ? computePayrollFromPosition(positionPayroll, settings)
        : salary
          ? computePayrollFromSalary(salary, settings)
          : null;
      if (!result) {
        return {
          bulletinLines: [] as PayrollSummaryLine[],
          extraLines: [] as PayrollSummaryLine[],
          netSalary: 0,
          extrasTotal: 0,
          grandTotal: 0,
          displayCurrency: (currency ?? "USD") as Currency,
        };
      }
      const cur = currency ?? result.currency ?? salary?.currency ?? positionPayroll?.currency ?? "USD";
      const costs = extraCosts ?? {
        housing: 0,
        mileage: 0,
        childrenEducation: 0,
        travel: 0,
        variables: 0,
        currency: cur,
      };
      const extras = showExtras ? totalExtraCosts(costs) : 0;
      return {
        bulletinLines: buildPayslipSummaryLines(result),
        extraLines: showExtras ? buildExtraCostLines(costs) : [],
        netSalary: result.netSalary,
        extrasTotal: extras,
        grandTotal: showGrandTotal ? grandTotalToPay(result.netSalary, costs) : result.netSalary,
        displayCurrency: cur,
      };
    }, [salary, positionPayroll, extraCosts, settings, currency, showExtras, showGrandTotal]);

  if (!salary && !positionPayroll) {
    if (embedded) {
      return (
        <p className={cn("text-sm text-slate-500", className)}>Aucune donnée de rémunération.</p>
      );
    }
    return (
      <Card className={cn("border-white/10 bg-black/20", className)}>
        <CardContent className="py-4 text-sm text-slate-500">Aucune donnée de rémunération.</CardContent>
      </Card>
    );
  }

  const visibleBulletinLines =
    showNetHighlight && !showGrandTotal
      ? bulletinLines.filter((l) => l.label !== "Net à payer (bulletin)")
      : bulletinLines;

  const body = (
    <>
      {!embedded && (
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-300/90">{title}</p>
      )}
      {showBulletin && (
        <SummaryLines
          lines={visibleBulletinLines}
          formatSalary={formatSalary}
          currency={displayCurrency}
        />
      )}
      {showExtras && extraCosts && (
        <div className={cn(showBulletin && !embedded && "border-t border-white/10 pt-3")}>
          {showBulletin && !embedded && (
            <p className="mb-3 text-[10px] font-semibold uppercase text-slate-500">Coûts extra</p>
          )}
          {editableExtras && onExtraCostsChange ? (
            <ul className={cn(embedded ? "space-y-1.5" : "space-y-2.5")}>
              {EXTRA_COST_FIELDS.map(({ field, label }) => (
                <li
                  key={field}
                  className="flex items-center justify-between gap-2 text-sm text-slate-300"
                >
                  <label htmlFor={`extra-${field}`} className="min-w-0 shrink text-xs sm:text-sm">
                    {label}
                  </label>
                  <input
                    id={`extra-${field}`}
                    type="number"
                    min={0}
                    step={1}
                    disabled={extrasDisabled}
                    value={extraCosts[field] ?? 0}
                    onChange={(e) =>
                      onExtraCostsChange({
                        ...extraCosts,
                        [field]: Number(e.target.value) || 0,
                      })
                    }
                    className="w-24 shrink-0 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-right text-sm text-white tabular-nums disabled:opacity-50"
                  />
                </li>
              ))}
              <li className="flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 text-sm font-semibold text-white">
                <span>Total coûts extra</span>
                <span className="tabular-nums">{formatSalary(extrasTotal, displayCurrency)}</span>
              </li>
            </ul>
          ) : (
            <SummaryLines
              lines={extraLines}
              formatSalary={formatSalary}
              currency={displayCurrency}
            />
          )}
        </div>
      )}
      {showGrandTotal && (
        <div
          className={cn(
            "rounded-lg border border-amber-500/30 bg-amber-500/10",
            embedded ? "px-3 py-2" : "rounded-xl px-4 py-3"
          )}
        >
          <p className="text-[10px] uppercase text-amber-200/80">Grand total à payer</p>
          <p className={cn("font-bold text-amber-300", embedded ? "text-lg" : "text-2xl")}>
            {formatSalary(grandTotal, displayCurrency)}
          </p>
        </div>
      )}
      {showNetHighlight && !showGrandTotal && (
        <div
          className={cn(
            "rounded-lg border border-sky-500/30 bg-sky-500/10",
            embedded ? "px-3 py-2" : "rounded-xl px-4 py-3"
          )}
        >
          <p className="text-[10px] uppercase text-sky-200/80">Net à payer (bulletin)</p>
          <p className={cn("font-bold text-white", embedded ? "text-lg" : "text-2xl")}>
            {formatSalary(netSalary, displayCurrency)}
          </p>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className={cn("space-y-2", className)}>{body}</div>;
  }

  return (
    <Card className={cn("border-sky-900/40 bg-sky-950/20", className)}>
      <CardContent className="space-y-4 pt-4">{body}</CardContent>
    </Card>
  );
}

function SummaryLines({
  lines,
  formatSalary,
  currency,
}: {
  lines: PayrollSummaryLine[];
  formatSalary: (n: number, c: Currency) => string;
  currency: Currency;
}) {
  return (
    <ul className="space-y-1.5">
      {lines.map((line) => (
        <li
          key={line.label}
          className={cn(
            "flex items-center justify-between gap-3 text-sm",
            line.variant === "total" && "font-semibold text-white",
            line.variant === "deduction" && "text-rose-300/90",
            line.variant === "gain" && "text-slate-300",
            !line.variant && "text-slate-400"
          )}
        >
          <span className="min-w-0">{line.label}</span>
          <span className="shrink-0 tabular-nums">
            {line.value < 0 ? "−" : ""}
            {formatSalary(Math.abs(line.value), currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}
