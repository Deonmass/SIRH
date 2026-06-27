import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricTone =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "cyan"
  | "orange"
  | "indigo"
  | "slate";

export const METRIC_TONE_STYLES: Record<
  MetricTone,
  {
    gradient: string;
    hoverGradient: string;
    border: string;
    hoverBorder: string;
    shadow: string;
    iconBg: string;
    valueColor: string;
  }
> = {
  sky: {
    gradient: "from-sky-500/22 via-sky-600/8 to-[var(--shell-card)]",
    hoverGradient: "group-hover:from-sky-500/32 group-hover:via-indigo-500/14",
    border: "border-sky-500/25",
    hoverBorder: "hover:border-sky-400/55",
    shadow: "hover:shadow-sky-500/30",
    iconBg: "bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sky-500/30",
    valueColor: "text-[var(--shell-text)]",
  },
  emerald: {
    gradient: "from-emerald-500/22 via-emerald-600/8 to-[var(--shell-card)]",
    hoverGradient: "group-hover:from-emerald-500/32 group-hover:via-teal-500/14",
    border: "border-emerald-500/25",
    hoverBorder: "hover:border-emerald-400/55",
    shadow: "hover:shadow-emerald-500/30",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30",
    valueColor: "text-emerald-300",
  },
  amber: {
    gradient: "from-amber-500/22 via-amber-600/8 to-[var(--shell-card)]",
    hoverGradient: "group-hover:from-amber-500/32 group-hover:via-orange-500/14",
    border: "border-amber-500/25",
    hoverBorder: "hover:border-amber-400/55",
    shadow: "hover:shadow-amber-500/30",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30",
    valueColor: "text-amber-300",
  },
  rose: {
    gradient: "from-rose-500/22 via-rose-600/8 to-[var(--shell-card)]",
    hoverGradient: "group-hover:from-rose-500/32 group-hover:via-pink-500/14",
    border: "border-rose-500/25",
    hoverBorder: "hover:border-rose-400/55",
    shadow: "hover:shadow-rose-500/30",
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30",
    valueColor: "text-rose-300",
  },
  violet: {
    gradient: "from-violet-500/22 via-violet-600/8 to-[var(--shell-card)]",
    hoverGradient: "group-hover:from-violet-500/32 group-hover:via-purple-500/14",
    border: "border-violet-500/25",
    hoverBorder: "hover:border-violet-400/55",
    shadow: "hover:shadow-violet-500/30",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30",
    valueColor: "text-violet-300",
  },
  cyan: {
    gradient: "from-cyan-500/22 via-cyan-600/8 to-[var(--shell-card)]",
    hoverGradient: "group-hover:from-cyan-500/32 group-hover:via-sky-500/14",
    border: "border-cyan-500/25",
    hoverBorder: "hover:border-cyan-400/55",
    shadow: "hover:shadow-cyan-500/30",
    iconBg: "bg-gradient-to-br from-cyan-500 to-sky-600 shadow-cyan-500/30",
    valueColor: "text-cyan-300",
  },
  orange: {
    gradient: "from-orange-500/22 via-orange-600/8 to-[var(--shell-card)]",
    hoverGradient: "group-hover:from-orange-500/32 group-hover:via-amber-500/14",
    border: "border-orange-500/25",
    hoverBorder: "hover:border-orange-400/55",
    shadow: "hover:shadow-orange-500/30",
    iconBg: "bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/30",
    valueColor: "text-orange-300",
  },
  indigo: {
    gradient: "from-indigo-500/22 via-indigo-600/8 to-[var(--shell-card)]",
    hoverGradient: "group-hover:from-indigo-500/32 group-hover:via-violet-500/14",
    border: "border-indigo-500/25",
    hoverBorder: "hover:border-indigo-400/55",
    shadow: "hover:shadow-indigo-500/30",
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/30",
    valueColor: "text-indigo-200",
  },
  slate: {
    gradient: "from-slate-500/18 via-slate-600/6 to-[var(--shell-card)]",
    hoverGradient: "group-hover:from-slate-400/24 group-hover:via-slate-500/10",
    border: "border-slate-500/25",
    hoverBorder: "hover:border-slate-400/45",
    shadow: "hover:shadow-slate-500/20",
    iconBg: "bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-500/25",
    valueColor: "text-slate-300",
  },
};

/** Rangée KPI pleine largeur — colonnes égales selon l'espace disponible */
export function DashboardMetricsRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full gap-2",
        "[grid-template-columns:repeat(auto-fit,minmax(min(100%,9.5rem),1fr))]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DashboardMetric({
  children,
  tone = "sky",
  compact,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: MetricTone; compact?: boolean }) {
  const style = METRIC_TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "dashboard-metric group relative w-full min-w-0 overflow-hidden rounded-xl border",
        compact ? "p-3" : "p-4",
        compact ? "min-h-[76px]" : "min-h-[108px]",
        `dashboard-metric--${tone}`,
        "flex flex-col justify-center transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-lg",
        style.border,
        style.hoverBorder,
        style.shadow,
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "dashboard-metric__gradient pointer-events-none absolute inset-0 bg-gradient-to-br transition-all duration-300",
          style.gradient,
          style.hoverGradient
        )}
        aria-hidden
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

/** Carte KPI avec icône, valeur et libellé */
export function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "sky",
  className,
  hint,
  compact,
  onClick,
}: {
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: MetricTone;
  className?: string;
  hint?: string;
  compact?: boolean;
  onClick?: () => void;
}) {
  const style = METRIC_TONE_STYLES[tone];

  const content = (
    <>
      <div
        className={cn(
          "inline-flex rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105",
          compact ? "mb-2 p-1.5" : "mb-3 p-2.5",
          style.iconBg
        )}
      >
        <Icon className={cn("text-white", compact ? "h-3.5 w-3.5" : "h-4 w-4")} strokeWidth={2.25} />
      </div>
      <p
        className={cn(
          "font-semibold tabular-nums leading-tight",
          compact ? "text-sm" : "text-2xl",
          style.valueColor
        )}
      >
        {value}
      </p>
      <p className={cn("mt-1.5 text-[var(--shell-text-muted)] line-clamp-2", compact ? "text-[10px]" : "text-xs")}>
        {label}
      </p>
      {hint && (
        <p className="mt-0.5 text-[10px] text-[var(--shell-text-muted)] opacity-80">{hint}</p>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left appearance-none border-0 bg-transparent p-0"
      >
        <DashboardMetric tone={tone} compact={compact} className={cn("cursor-pointer w-full", className)}>
          {content}
        </DashboardMetric>
      </button>
    );
  }

  return (
    <DashboardMetric tone={tone} compact={compact} className={className}>
      {content}
    </DashboardMetric>
  );
}

export const GridStatsRow = DashboardMetricsRow;

export function GridStatMetric(props: React.ComponentProps<typeof MetricCard>) {
  return <MetricCard {...props} />;
}

/** @deprecated Utiliser METRIC_TONE_STYLES */
export const TONE_STYLES = METRIC_TONE_STYLES;
