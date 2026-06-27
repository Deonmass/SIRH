import { cn } from "@/lib/utils";
import {
  DashboardMetric,
  MetricCard,
  type MetricTone,
} from "@/components/dashboard/DashboardMetricsRow";
import type { LucideIcon } from "lucide-react";

/** Grille responsive 8 colonnes sur grand écran (sauf tableaux) */
export function Grid8({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Grille cartes (2–5 colonnes) pour contenus moyens */
export function GridCards({
  children,
  className,
  cols = 4,
}: {
  children: React.ReactNode;
  className?: string;
  cols?: 2 | 3 | 4 | 5;
}) {
  const colClass =
    cols === 2
      ? "sm:grid-cols-2"
      : cols === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : cols === 4
          ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  return (
    <div className={cn("grid grid-cols-1 gap-3", colClass, className)}>{children}</div>
  );
}

export function GridStat({
  children,
  className,
  tone,
  icon,
  label,
  value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: MetricTone;
  icon?: LucideIcon;
  label?: string;
  value?: React.ReactNode;
}) {
  if (tone && icon && label !== undefined && value !== undefined) {
    return (
      <MetricCard tone={tone} icon={icon} label={label} value={value} className={className} />
    );
  }

  if (tone) {
    return (
      <DashboardMetric tone={tone} className={className} {...props}>
        {children}
      </DashboardMetric>
    );
  }

  return (
    <div
      className={cn(
        "group relative min-h-[96px] overflow-hidden rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-4",
        "flex flex-col justify-center transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-sky-500/50 hover:bg-sky-500/[0.08] hover:shadow-lg hover:shadow-sky-500/20",
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/0 to-indigo-500/0 opacity-0 transition-opacity duration-300 group-hover:from-sky-500/10 group-hover:to-indigo-500/5 group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

/** Rangée KPI pleine largeur (remplace Grid8 pour les stats chiffrées) */
export function GridStatsRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full gap-3",
        "[grid-template-columns:repeat(auto-fit,minmax(min(100%,9.5rem),1fr))]",
        className
      )}
    >
      {children}
    </div>
  );
}
