import type { Currency } from "./types";

/** Arrondi affichage / saisie */
export function roundMoney(amount: number, currency: Currency): number {
  if (!Number.isFinite(amount)) return 0;
  if (currency === "CDF") return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

/**
 * Conversion USD ↔ CDF (taux BCC : 1 USD = exchangeRate CDF).
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  exchangeRate: number
): number {
  if (from === to) return roundMoney(amount, to);
  if (!Number.isFinite(amount) || exchangeRate <= 0) return amount;

  if (from === "USD" && to === "CDF") {
    return roundMoney(amount * exchangeRate, "CDF");
  }
  return roundMoney(amount / exchangeRate, "USD");
}

export function toCdf(amount: number, currency: Currency, exchangeRate: number): number {
  return convertCurrency(amount, currency, "CDF", exchangeRate);
}

export function fromCdf(amountCdf: number, currency: Currency, exchangeRate: number): number {
  return convertCurrency(amountCdf, "CDF", currency, exchangeRate);
}
