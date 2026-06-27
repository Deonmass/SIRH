"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Building2,
  Calendar,
  Landmark,
  Receipt,
  Shield,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PaieMasseSkeleton } from "@/components/ui/PageSkeletons";
import {
  DashboardMetricsRow,
  MetricCard,
  type MetricTone,
} from "@/components/dashboard/DashboardMetricsRow";
import { PaieMasseAnnualChart } from "@/components/paie/PaieMasseAnnualChart";
import { PaieMasseDetailModal } from "@/components/paie/PaieMasseDetailModal";
import type { PaieMasseBreakdown } from "@/lib/types";
import type { PaieMasseMetricKey } from "@/lib/paie-masse";
import { totalChargesReverser, totalDecaissement } from "@/lib/paie-masse";
import { currentPayPeriod } from "@/lib/payslip-engine";
import { cn } from "@/lib/utils";

const MONTHS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
] as const;

const DEPT_TONES: MetricTone[] = [
  "sky",
  "emerald",
  "amber",
  "violet",
  "cyan",
  "indigo",
  "rose",
  "orange",
  "slate",
];

type DetailState = {
  metric: PaieMasseMetricKey;
  department?: string;
  title?: string;
};

function parsePeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  return { year: y || new Date().getFullYear(), month: m || new Date().getMonth() + 1 };
}

function formatMoney(n: number, currency: string) {
  return `${n.toLocaleString("fr-FR")} ${currency}`;
}

function buildYearOptions() {
  const y = new Date().getFullYear();
  return [y - 1, y, y + 1];
}

export function PaieMassePanel({ initialPeriod }: { initialPeriod?: string }) {
  const initial = parsePeriod(initialPeriod ?? currentPayPeriod());
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [masse, setMasse] = useState<PaieMasseBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailState | null>(null);

  const period = useMemo(
    () => `${year}-${String(month).padStart(2, "0")}`,
    [year, month]
  );

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/paie/masse?period=${encodeURIComponent(p)}`);
      if (res.ok) setMasse(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [period, load]);

  const decaissement = masse ? totalDecaissement(masse) : 0;
  const charges = masse ? totalChargesReverser(masse) : 0;
  const currency = masse?.currency ?? "USD";

  const openDetail = (metric: PaieMasseMetricKey, opts?: { department?: string; title?: string }) => {
    setDetail({ metric, ...opts });
  };

  return (
    <section className="mb-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--shell-text)]">Masse salariale mensuelle</h2>
          <p className="text-xs text-[var(--shell-text-muted)]">
            Données issues des clôtures pointage — cliquez sur une carte pour le détail par employé
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2 text-sm">
            <Calendar className="h-4 w-4 shrink-0 text-sky-500" />
            <span className="text-xs text-[var(--shell-text-muted)]">Mois</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-transparent font-medium text-[var(--shell-text)] outline-none"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2 text-sm">
            <span className="text-xs text-[var(--shell-text-muted)]">Année</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent font-medium text-[var(--shell-text)] outline-none"
            >
              {buildYearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <PaieMasseSkeleton />
      ) : masse ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                masse.isCurrentMonth
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
              )}
            >
              {masse.isCurrentMonth ? "Mois en cours" : masse.periodLabel}
            </span>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
              Synthèse du mois
            </h3>
            <DashboardMetricsRow>
              <MetricCard
                compact
                tone="sky"
                icon={Users}
                label="Employés actifs (paie)"
                value={masse.employeeCount}
                onClick={() => openDetail("employeeCount")}
              />
              <MetricCard
                compact
                tone="emerald"
                icon={Banknote}
                label="Net à payer (salariés)"
                value={formatMoney(masse.totalNet, currency)}
                onClick={() => openDetail("totalNet")}
              />
              <MetricCard
                compact
                tone="amber"
                icon={Wallet}
                label="Coûts extra"
                value={formatMoney(masse.totalExtraCosts, currency)}
                onClick={() => openDetail("totalExtraCosts")}
              />
              <MetricCard
                compact
                tone="sky"
                icon={TrendingUp}
                label="Total décaissement"
                value={formatMoney(decaissement, currency)}
                onClick={() => openDetail("totalDecaissement")}
              />
              <MetricCard
                compact
                tone="violet"
                icon={Receipt}
                label="Coût employeur total"
                value={formatMoney(masse.totalEmployerCost, currency)}
                onClick={() => openDetail("totalEmployerCost")}
              />
              <MetricCard
                compact
                tone="cyan"
                icon={TrendingUp}
                label="Masse brute"
                value={formatMoney(masse.totalGross, currency)}
                onClick={() => openDetail("totalGross")}
              />
            </DashboardMetricsRow>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
              Charges à reverser
            </h3>
            <DashboardMetricsRow>
              <MetricCard
                compact
                tone="indigo"
                icon={Shield}
                label="CNSS salarié"
                value={formatMoney(masse.totalCnssEmployee, currency)}
                onClick={() => openDetail("totalCnssEmployee")}
              />
              <MetricCard
                compact
                tone="indigo"
                icon={Shield}
                label="CNSS employeur"
                value={formatMoney(masse.totalCnssEmployer, currency)}
                onClick={() => openDetail("totalCnssEmployer")}
              />
              <MetricCard
                compact
                tone="amber"
                icon={Landmark}
                label="IRPP / DGI"
                value={formatMoney(masse.totalIpr, currency)}
                onClick={() => openDetail("totalIpr")}
              />
              <MetricCard
                compact
                tone="rose"
                icon={Building2}
                label="ONEM"
                value={formatMoney(masse.totalOnem, currency)}
                onClick={() => openDetail("totalOnem")}
              />
              <MetricCard
                compact
                tone="orange"
                icon={Building2}
                label="INPP"
                value={formatMoney(masse.totalInpp, currency)}
                onClick={() => openDetail("totalInpp")}
              />
              <MetricCard
                compact
                tone="slate"
                icon={Receipt}
                label="Total charges"
                value={formatMoney(charges, currency)}
                onClick={() => openDetail("totalCharges")}
              />
            </DashboardMetricsRow>
          </div>

          {masse.byDepartment.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
                <Building2 className="h-3.5 w-3.5" />
                Par département
              </h3>
              <DashboardMetricsRow>
                {masse.byDepartment.map((d, i) => (
                  <MetricCard
                    key={d.department}
                    compact
                    tone={DEPT_TONES[i % DEPT_TONES.length]}
                    icon={Building2}
                    label={d.department}
                    value={formatMoney(d.net, currency)}
                    hint={`${d.count} salarié(s)`}
                    onClick={() =>
                      openDetail("departmentNet", {
                        department: d.department,
                        title: `Net — ${d.department}`,
                      })
                    }
                  />
                ))}
              </DashboardMetricsRow>
            </div>
          )}

          <PaieMasseAnnualChart year={year} />
        </>
      ) : (
        <p className="py-8 text-center text-[var(--shell-text-muted)]">Aucune donnée disponible.</p>
      )}

      {detail && (
        <PaieMasseDetailModal
          open
          onClose={() => setDetail(null)}
          period={period}
          metric={detail.metric}
          departmentFilter={detail.department}
          title={detail.title}
        />
      )}
    </section>
  );
}
