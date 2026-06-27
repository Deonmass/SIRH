"use client";

import { buildIrppFormulaTokens, type IrppFormulaToken } from "@/lib/irpp-bareme";
import type { IrppFormulaDetail } from "@/lib/payroll-simulator-config";
import type { Currency } from "@/lib/types";
import { cn } from "@/lib/utils";

export function IrppFormulaDisplay({
  detail,
  currency,
  exchangeRate,
  formatSalary,
  className,
}: {
  detail: IrppFormulaDetail;
  currency: Currency;
  exchangeRate: number;
  formatSalary: (amount: number, currency?: Currency) => string;
  className?: string;
}) {
  const tokens = buildIrppFormulaTokens({
    bracketBreakdown: detail.bracketBreakdown,
    iprBeforeAbatement: detail.iprBeforeAbatement,
    iprAbatementPercent: detail.iprAbatementPercent,
    ipr: detail.ipr,
    baseIpr: detail.baseIpr,
    formatAmount: (amount) => formatSalary(amount, currency),
    displayCurrency: currency,
    exchangeRate,
  });

  return (
    <p className={cn("font-mono text-[11px] leading-snug text-amber-200/70", className)}>
      {tokens.map((token, index) => (
        <IrppFormulaTokenSpan key={`${index}-${token.display}`} token={token} />
      ))}
    </p>
  );
}

function IrppFormulaTokenSpan({ token }: { token: IrppFormulaToken }) {
  if (!token.tooltip) {
    return <span>{token.display}</span>;
  }

  return (
    <span
      title={token.tooltip}
      className="cursor-help underline decoration-dotted decoration-amber-400/50 underline-offset-2"
    >
      {token.display}
    </span>
  );
}
