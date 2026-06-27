"use client";

import { AlertTriangle, Gauge } from "lucide-react";
import { formatKm, type EntretienAlertLevel } from "@/lib/charroi-entretien";
import { cn } from "@/lib/utils";

const ALERT_STYLES: Record<
  EntretienAlertLevel,
  { badge: string; icon: typeof Gauge }
> = {
  ok: {
    badge: "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400",
    icon: Gauge,
  },
  warning: {
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    icon: AlertTriangle,
  },
  overdue: {
    badge: "bg-red-500/15 text-red-600 dark:text-red-400",
    icon: AlertTriangle,
  },
  unknown: {
    badge: "bg-slate-500/15 text-[var(--shell-text-muted)]",
    icon: Gauge,
  },
};

export function EntretienAlertBadge({
  level,
  label,
}: {
  level: EntretienAlertLevel;
  label: string;
}) {
  const style = ALERT_STYLES[level];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight",
        style.badge
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function ProchainEntretienKmCell({
  prochainKm,
  kmRestant,
  alertLevel = "ok",
  size = "md",
}: {
  prochainKm?: number;
  kmRestant?: number;
  alertLevel?: EntretienAlertLevel;
  size?: "sm" | "md" | "lg";
}) {
  if (prochainKm == null) {
    return <span className="text-[var(--shell-text-muted)]">—</span>;
  }

  const tone =
    alertLevel === "overdue"
      ? "border-red-500/45 bg-red-500/12 text-red-600 dark:text-red-400"
      : alertLevel === "warning"
        ? "border-amber-500/45 bg-amber-500/12 text-amber-600 dark:text-amber-400"
        : alertLevel === "unknown"
          ? "border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--shell-text-muted)]"
          : "border-sky-500/45 bg-sky-500/12 text-sky-600 dark:text-sky-400";

  const kmClass =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      className={cn(
        "inline-flex min-w-[4.75rem] flex-col rounded-lg border px-2 py-1",
        tone
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wide opacity-90">
        Prochain km
      </span>
      <span className={cn("font-bold tabular-nums leading-tight", kmClass)}>
        {formatKm(prochainKm)}
      </span>
      {kmRestant != null && alertLevel !== "unknown" && (
        <span className="text-[9px] tabular-nums opacity-80">
          {kmRestant <= 0 ? "Échéance atteinte" : `Reste ${formatKm(kmRestant)}`}
        </span>
      )}
    </div>
  );
}

export const ENTRETIEN_TABLE_TH =
  "!px-2 !py-1 !text-[10px] !font-semibold !normal-case !tracking-normal whitespace-nowrap";
export const ENTRETIEN_TABLE_TD = "!px-2 !py-1.5 text-xs";
