"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import {
  MOIS_FR_OPTIONS,
  moisAnneeFromParts,
  parseMoisAnnee,
  pointageYearOptions,
} from "@/lib/pointage-utils";

export function PointagePeriodSelect({
  basePath,
  extraParams,
  onRefresh,
  refreshing = false,
}: {
  basePath: "/pointage/saisie" | "/pointage/gestion";
  extraParams?: Record<string, string>;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();
  const defaultMois = moisAnneeFromParts(now.getFullYear(), now.getMonth() + 1);
  const mois = searchParams.get("mois") ?? defaultMois;
  const { year, month } = parseMoisAnnee(mois);

  const years = useMemo(() => pointageYearOptions(now), [now]);

  function navigate(nextYear: number, nextMonth: number) {
    const nextMois = moisAnneeFromParts(nextYear, nextMonth);
    const params = new URLSearchParams({ mois: nextMois });
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        if (v) params.set(k, v);
      }
    }
    router.replace(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-[var(--shell-text-muted)]">Année</span>
        <select
          className="input min-w-[5.5rem]"
          value={year}
          onChange={(e) => navigate(Number(e.target.value), month)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-[var(--shell-text-muted)]">Mois</span>
        <select
          className="input min-w-[8.5rem]"
          value={month}
          onChange={(e) => navigate(year, Number(e.target.value))}
        >
          {MOIS_FR_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--shell-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--shell-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {refreshing ? "Actualisation..." : "Actualiser"}
        </button>
      ) : null}
    </div>
  );
}
