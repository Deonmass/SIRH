import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MASKED_SALARY = "•••••";

export function formatSalaryDisplay(
  amount: number,
  currency: "USD" | "CDF" = "USD",
  hide?: boolean
): string {
  if (hide) return MASKED_SALARY;
  return formatCurrency(amount, currency);
}

export function formatCurrency(amount: number, currency: "USD" | "CDF" = "USD"): string {
  if (!Number.isFinite(amount)) return currency === "USD" ? "$0.00" : "0 CDF";
  if (currency === "USD") {
    return new Intl.NumberFormat("fr-CD", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  }
  return (
    new Intl.NumberFormat("fr-CD", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " CDF"
  );
}

/** Variante sans espaces insécables (export PDF / jsPDF). */
export function formatCurrencyForPdf(amount: number, currency: "USD" | "CDF" = "USD"): string {
  return formatCurrency(amount, currency).replace(/[\u00A0\u202F\u2007\u2009\uFEFF]/g, " ");
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function generateMatricule(index: number): string {
  const year = new Date().getFullYear();
  return `RDC-${year}-${String(index).padStart(4, "0")}`;
}

export function yearsOfService(hireDate?: string): number {
  if (!hireDate) return 0;
  const start = new Date(hireDate);
  const now = new Date();
  return Math.floor(
    (now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
}

export function ageFromBirth(dateStr: string): number | null {
  if (!dateStr) return null;
  const birth = parseBirthDate(dateStr);
  if (!birth) return null;
  const now = new Date();
  return Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function parseBirthDate(dateStr: string): Date | null {
  const normalized = dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr;
  const birth = new Date(normalized);
  if (Number.isNaN(birth.getTime())) return null;
  return birth;
}

/** Âge lisible : années, sinon mois, sinon jours (pour les nourrissons). */
export function formatAgeFromBirth(dateStr: string): string | null {
  if (!dateStr) return null;
  const birth = parseBirthDate(dateStr);
  if (!birth) return null;
  const now = new Date();
  if (now.getTime() < birth.getTime()) return null;

  const years = ageFromBirth(dateStr);
  if (years != null && years >= 1) {
    return years === 1 ? "1 an" : `${years} ans`;
  }

  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  months = Math.max(0, months);

  if (months >= 1) {
    return months === 1 ? "1 mois" : `${months} mois`;
  }

  const totalDays = Math.floor((now.getTime() - birth.getTime()) / (24 * 60 * 60 * 1000));
  if (totalDays <= 0) return "0 jour";
  return totalDays === 1 ? "1 jour" : `${totalDays} jours`;
}
