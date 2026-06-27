"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type NumericInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  value: number;
  onChange: (value: number) => void;
  /** Autorise une saisie vide temporaire (y compris effacer le 0) */
  allowEmpty?: boolean;
  /** Valeur appliquée au blur si le champ est vide */
  emptyValue?: number;
  /** Décimales autorisées (virgule ou point à la saisie) */
  decimal?: boolean;
  /** Séparateur de milliers (espace) à l'affichage — typique CDF */
  thousands?: boolean;
};

function stripForParse(raw: string, thousands: boolean): string {
  let s = thousands ? raw.replace(/\s/g, "") : raw;
  if (thousands) s = s.replace(",", ".");
  return s;
}

function isPartialNumeric(raw: string, decimal: boolean, thousands: boolean): boolean {
  const cleaned = stripForParse(raw, thousands);
  if (cleaned === "") return true;
  if (decimal) return /^\d*\.?\d*$/.test(cleaned);
  return /^\d*$/.test(cleaned);
}

function parseNumeric(raw: string, decimal: boolean, thousands: boolean): number {
  const cleaned = stripForParse(raw, thousands);
  const n = decimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : NaN;
}

function formatDisplay(value: number, decimal: boolean, thousands: boolean): string {
  if (!Number.isFinite(value)) return "";

  if (thousands) {
    const formatted = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: decimal ? 2 : 0,
      maximumFractionDigits: decimal ? 2 : 0,
    }).format(value);
    return formatted.replace(/\u202f/g, " ").replace(/\u00a0/g, " ");
  }

  if (decimal) {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return String(Math.trunc(value));
}

export function NumericInput({
  value,
  onChange,
  allowEmpty = true,
  emptyValue = 0,
  decimal = false,
  thousands = false,
  className,
  onBlur,
  onFocus,
  min,
  max,
  ...props
}: NumericInputProps) {
  const [text, setText] = useState(() => formatDisplay(value, decimal, thousands));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatDisplay(value, decimal, thousands));
    }
  }, [value, decimal, thousands, focused]);

  function clamp(n: number): number {
    let out = n;
    if (typeof min === "number" && out < min) out = min;
    if (typeof max === "number" && out > max) out = max;
    return out;
  }

  function commit(n: number) {
    onChange(clamp(n));
  }

  return (
    <input
      {...props}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      className={cn(className)}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        if (text === "" || text === "." || text === ",") {
          if (allowEmpty) {
            commit(emptyValue);
            setText(formatDisplay(emptyValue, decimal, thousands));
          }
        } else {
          const n = parseNumeric(text, decimal, thousands);
          if (Number.isFinite(n)) {
            commit(n);
            setText(formatDisplay(clamp(n), decimal, thousands));
          } else {
            setText(formatDisplay(value, decimal, thousands));
          }
        }
        onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (!isPartialNumeric(raw, decimal, thousands)) return;
        setText(raw);
        const cleaned = stripForParse(raw, thousands);
        if (cleaned === "" || cleaned === ".") return;
        const n = parseNumeric(raw, decimal, thousands);
        if (Number.isFinite(n)) commit(n);
      }}
    />
  );
}
