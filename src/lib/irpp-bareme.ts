import type { Currency, IrppBracketConfig } from "./types";

/** Barème IRPP (ex-IPR) — tranches de revenus annuels en FC (Code des impôts) */
export const DEFAULT_IRPP_BRACKETS: IrppBracketConfig[] = [
  { rate: 0.03, fromAnnualCdf: 0, toAnnualCdf: 1_944_000 },
  { rate: 0.15, fromAnnualCdf: 1_944_001, toAnnualCdf: 21_600_000 },
  { rate: 0.3, fromAnnualCdf: 21_600_001, toAnnualCdf: 43_200_000 },
  { rate: 0.4, fromAnnualCdf: 43_200_001, toAnnualCdf: null },
];

export const DEFAULT_IRPP_MIN_MONTHLY_CDF = 2_500;
export const DEFAULT_IRPP_MAX_RATE_OF_TAXABLE = 0.3;
export const IRPP_DEPENDENT_ABATEMENT = 0.02;
export const IRPP_MAX_DEPENDENTS = 9;

/** @deprecated Utiliser DEFAULT_IRPP_BRACKETS — barème mensuel dérivé (÷ 12) */
export const IPR_BRACKETS_CDF = irppBracketsToMonthly(DEFAULT_IRPP_BRACKETS);

export function irppBracketsToMonthly(
  brackets: IrppBracketConfig[]
): { upTo: number; rate: number }[] {
  const sorted = [...brackets].sort((a, b) => a.fromAnnualCdf - b.fromAnnualCdf);
  return sorted.map((b) => ({
    rate: b.rate,
    upTo: b.toAnnualCdf == null ? Infinity : b.toAnnualCdf / 12,
  }));
}

export function formatIrppBracketRange(fromAnnualCdf: number, toAnnualCdf: number | null): string {
  const fmt = (n: number) => n.toLocaleString("fr-CD");
  if (toAnnualCdf == null) {
    return `> ${fmt(fromAnnualCdf)} FC/an (surplus)`;
  }
  if (fromAnnualCdf <= 0) {
    return `0 – ${fmt(toAnnualCdf)} FC/an`;
  }
  return `${fmt(fromAnnualCdf)} – ${fmt(toAnnualCdf)} FC/an`;
}

export function monthlyCeilingFromBracket(toAnnualCdf: number | null): string {
  if (toAnnualCdf == null) return "—";
  return (toAnnualCdf / 12).toLocaleString("fr-CD", { maximumFractionDigits: 0 });
}

export function normalizeIrppBrackets(brackets?: IrppBracketConfig[]): IrppBracketConfig[] {
  if (!brackets?.length) {
    return DEFAULT_IRPP_BRACKETS.map((b) => ({ ...b }));
  }
  return brackets.map((b, i) => ({
    rate: b.rate ?? DEFAULT_IRPP_BRACKETS[i]?.rate ?? 0,
    fromAnnualCdf: b.fromAnnualCdf ?? DEFAULT_IRPP_BRACKETS[i]?.fromAnnualCdf ?? 0,
    toAnnualCdf:
      b.toAnnualCdf === undefined
        ? DEFAULT_IRPP_BRACKETS[i]?.toAnnualCdf ?? null
        : b.toAnnualCdf,
  }));
}

export interface IrppCalcConfig {
  brackets?: IrppBracketConfig[];
  minMonthlyCdf?: number;
  maxRateOfTaxable?: number;
  maxDependents?: number;
  abatementPerDependent?: number;
}

/** Tranche du barème effectivement utilisée pour une base mensuelle */
export interface IrppBracketApplication {
  rate: number;
  taxableCdf: number;
  taxCdf: number;
}

export function formatIrppRatePercent(rate: number): string {
  const pct = rate * 100;
  return pct.toLocaleString("fr-CD", {
    minimumFractionDigits: Number.isInteger(pct) ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

export function formatIrppAppliedRatesLabel(rates: number[]): string {
  const applied = rates.filter((rate) => rate > 0);
  if (!applied.length) return "";
  return applied.map((rate) => `${formatIrppRatePercent(rate)} %`).join(" + ");
}

export function buildIrppDisplayLabel(
  appliedRates: number[] | undefined,
  abatementPercent?: number
): string {
  const parts: string[] = [];
  if (appliedRates?.length) {
    parts.push(`barème ${formatIrppAppliedRatesLabel(appliedRates)}`);
  }
  if (abatementPercent && abatementPercent > 0) {
    parts.push(`abatt. ${(abatementPercent * 100).toFixed(0)} %`);
  }
  if (!parts.length) return "IRPP";
  return `IRPP (${parts.join(" · ")})`;
}

export type IrppFormulaToken = {
  display: string;
  tooltip?: string;
};

export function buildIrppFormulaTokens(input: {
  bracketBreakdown?: { rate: number; taxableAmount: number; taxAmount?: number }[];
  iprBeforeAbatement: number;
  iprAbatementPercent?: number;
  ipr: number;
  baseIpr?: number;
  formatAmount: (amount: number) => string;
  displayCurrency?: Currency;
  exchangeRate?: number;
}): IrppFormulaToken[] {
  const {
    bracketBreakdown,
    iprBeforeAbatement,
    iprAbatementPercent,
    ipr,
    baseIpr,
    formatAmount,
    displayCurrency,
    exchangeRate,
  } = input;
  const fmt = formatAmount;
  const tokens: IrppFormulaToken[] = [];

  const amountTooltip = (amount: number, label: string): string => {
    if (displayCurrency === "USD" && exchangeRate && exchangeRate > 0) {
      const cdf = Math.round(amount * exchangeRate);
      return `${label} — barème ${cdf.toLocaleString("fr-CD")} FC/mois (équiv. ${fmt(amount)})`;
    }
    return `${label} — ${fmt(amount)}`;
  };

  const brackets = bracketBreakdown?.filter((b) => b.taxableAmount > 0) ?? [];

  if (brackets.length) {
    brackets.forEach((b, index) => {
      if (index > 0) tokens.push({ display: " + " });
      const rateLabel = formatIrppRatePercent(b.rate);
      tokens.push({
        display: fmt(b.taxableAmount),
        tooltip: amountTooltip(
          b.taxableAmount,
          `Base imposable tranche ${rateLabel} %`
        ),
      });
      tokens.push({ display: " × " });
      tokens.push({
        display: `${rateLabel} %`,
        tooltip: `Taux IRPP — tranche ${rateLabel} %`,
      });
    });

    tokens.push({ display: " = " });
    tokens.push({
      display: fmt(iprBeforeAbatement),
      tooltip: amountTooltip(iprBeforeAbatement, "IRPP brute avant abattement familial"),
    });

    if (iprAbatementPercent && iprAbatementPercent > 0) {
      const depCount = Math.round(iprAbatementPercent / IRPP_DEPENDENT_ABATEMENT);
      const abattLabel = (iprAbatementPercent * 100).toFixed(0);
      tokens.push({
        display: ` × (1 − ${abattLabel} %)`,
        tooltip:
          depCount > 0
            ? `Abattement charges de famille — ${depCount} pers. × ${(IRPP_DEPENDENT_ABATEMENT * 100).toFixed(0)} %`
            : `Abattement IRPP ${abattLabel} %`,
      });
      tokens.push({ display: " = " });
      tokens.push({
        display: fmt(ipr),
        tooltip: amountTooltip(ipr, "IRPP nette à retenir sur le salaire"),
      });
    }
    return tokens;
  }

  if (iprAbatementPercent && iprAbatementPercent > 0) {
    tokens.push({
      display: fmt(iprBeforeAbatement),
      tooltip: amountTooltip(iprBeforeAbatement, "IRPP brute avant abattement familial"),
    });
    const depCount = Math.round(iprAbatementPercent / IRPP_DEPENDENT_ABATEMENT);
    const abattLabel = (iprAbatementPercent * 100).toFixed(0);
    tokens.push({
      display: ` × (1 − ${abattLabel} %)`,
      tooltip:
        depCount > 0
          ? `Abattement charges de famille — ${depCount} pers. × ${(IRPP_DEPENDENT_ABATEMENT * 100).toFixed(0)} %`
          : `Abattement IRPP ${abattLabel} %`,
    });
    tokens.push({ display: " = " });
    tokens.push({
      display: fmt(ipr),
      tooltip: amountTooltip(ipr, "IRPP nette à retenir sur le salaire"),
    });
    return tokens;
  }

  if (baseIpr != null) {
    return [
      { display: "Barème progressif sur " },
      {
        display: fmt(baseIpr),
        tooltip: amountTooltip(baseIpr, "Base imposable IRPP (après CNSS salarié)"),
      },
      { display: " = " },
      {
        display: fmt(ipr),
        tooltip: amountTooltip(ipr, "IRPP nette à retenir sur le salaire"),
      },
    ];
  }

  return [
    { display: "Barème progressif = " },
    {
      display: fmt(ipr),
      tooltip: amountTooltip(ipr, "IRPP nette à retenir sur le salaire"),
    },
  ];
}

export function buildIrppFormulaText(input: {
  bracketBreakdown?: { rate: number; taxableAmount: number }[];
  iprBeforeAbatement: number;
  iprAbatementPercent?: number;
  ipr: number;
  baseIpr?: number;
  formatAmount: (amount: number) => string;
  displayCurrency?: Currency;
  exchangeRate?: number;
}): string {
  return buildIrppFormulaTokens(input)
    .map((token) => token.display)
    .join("");
}

/** IRPP progressif sur base mensuelle (CDF), abattement charges de famille, plancher et plafond */
export function calculateIrppCdf(
  baseMonthlyCdf: number,
  dependents = 0,
  config?: IrppCalcConfig
): {
  iprBeforeAbatement: number;
  iprAbatementPercent: number;
  iprDue: number;
  appliedBrackets: IrppBracketApplication[];
  marginalRate: number;
} {
  if (baseMonthlyCdf <= 0) {
    return {
      iprBeforeAbatement: 0,
      iprAbatementPercent: 0,
      iprDue: 0,
      appliedBrackets: [],
      marginalRate: 0,
    };
  }

  const brackets = irppBracketsToMonthly(
    normalizeIrppBrackets(config?.brackets)
  );
  const minMonthly = config?.minMonthlyCdf ?? DEFAULT_IRPP_MIN_MONTHLY_CDF;
  const maxRate = config?.maxRateOfTaxable ?? DEFAULT_IRPP_MAX_RATE_OF_TAXABLE;
  const maxDep = config?.maxDependents ?? IRPP_MAX_DEPENDENTS;
  const abatementEach = config?.abatementPerDependent ?? IRPP_DEPENDENT_ABATEMENT;

  let ipr = 0;
  let previousCap = 0;
  const appliedBrackets: IrppBracketApplication[] = [];
  let marginalRate = 0;

  for (const bracket of brackets) {
    if (baseMonthlyCdf <= previousCap) break;
    const taxableInBracket = Math.min(baseMonthlyCdf, bracket.upTo) - previousCap;
    if (taxableInBracket > 0) {
      const taxCdf = taxableInBracket * bracket.rate;
      ipr += taxCdf;
      appliedBrackets.push({ rate: bracket.rate, taxableCdf: taxableInBracket, taxCdf });
      marginalRate = bracket.rate;
    }
    previousCap = bracket.upTo === Infinity ? baseMonthlyCdf : bracket.upTo;
    if (baseMonthlyCdf <= bracket.upTo) break;
  }

  const iprAbatementPercent = Math.min(dependents, maxDep) * abatementEach;
  let iprDue = ipr * (1 - iprAbatementPercent);

  const cap = baseMonthlyCdf * maxRate;
  if (iprDue > cap) iprDue = cap;

  if (iprDue > 0 && iprDue < minMonthly) iprDue = minMonthly;

  return { iprBeforeAbatement: ipr, iprAbatementPercent, iprDue, appliedBrackets, marginalRate };
}

/** Alias historique (IPR) */
export function calculateIPRCdf(
  baseIprCdf: number,
  dependents = 0,
  config?: IrppCalcConfig
) {
  return calculateIrppCdf(baseIprCdf, dependents, config);
}
