"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  GitBranch,
  Hourglass,
  Loader2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardMetricsRow, MetricCard } from "@/components/dashboard/DashboardMetricsRow";
import { SectionQuickLinks } from "@/components/dashboard/SectionQuickLinks";
import { EmployesDashboardCharts } from "@/components/employees/EmployesDashboardCharts";
import { FolderTabs } from "@/components/layout/FolderTabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useLayout } from "@/contexts/LayoutContext";
import { employeeDossierHref } from "@/lib/employee-dossier-url";
import type { EmployesDashboardDetail } from "@/lib/employes-dashboard-detail";
import { MOIS_FR_OPTIONS } from "@/lib/pointage-utils";
import { formatDate } from "@/lib/utils";

type TabId = "synthese" | "analyses";

const selectClass =
  "rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2.5 py-2 text-sm";

const chartUiDark = {
  grid: "#334155",
  axis: "#94a3b8",
  tooltip: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
  } as React.CSSProperties,
};

const chartUiLight = {
  grid: "#e2e8f0",
  axis: "#64748b",
  tooltip: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    color: "#0f172a",
  } as React.CSSProperties,
};

export function EmployesDashboardClient() {
  const { theme } = useLayout();
  const chartUi = theme === "light" ? chartUiLight : chartUiDark;
  const now = useMemo(() => new Date(), []);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [activeTab, setActiveTab] = useState<TabId>("synthese");
  const [stats, setStats] = useState<EmployesDashboardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return Array.from({ length: 6 }, (_, i) => y - i);
  }, [now]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(filterYear) });
      if (filterMonth !== "") params.set("month", String(filterMonth));
      const res = await fetch(`/api/employes/dashboard?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStats(null);
        setError(
          typeof body.error === "string"
            ? body.error
            : res.status === 401
              ? "Accès refusé — reconnectez-vous ou vérifiez vos droits."
              : "Impossible de charger le tableau de bord."
        );
        return;
      }
      setStats(await res.json());
    } catch {
      setStats(null);
      setError("Erreur réseau — impossible de charger les indicateurs.");
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  const entreesLabel = filterMonth === "" ? "Entrées (année)" : "Entrées (mois)";
  const sortiesLabel = filterMonth === "" ? "Sorties (année)" : "Sorties (mois)";

  const tabs = useMemo(
    () => [
      { id: "synthese" as const, label: "Synthèse" },
      { id: "analyses" as const, label: "Analyses" },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Employés — Dashboard"
        description="Effectifs, mouvements, dossiers et accès rapide aux modules employés"
        className="!mb-0 !border-b-0"
        below={
          <FolderTabs
            tabs={tabs}
            active={activeTab}
            onChange={(id) => setActiveTab(id as TabId)}
            variant="flat"
            className="px-8"
            barClassName="bg-[var(--shell-header-bg)]"
          />
        }
      >
        <div className="flex flex-wrap items-end justify-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Année</span>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className={`min-w-[5.5rem] ${selectClass}`}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Mois</span>
            <select
              value={filterMonth}
              onChange={(e) =>
                setFilterMonth(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={`min-w-[7.5rem] ${selectClass}`}
            >
              <option value="">Tous</option>
              {MOIS_FR_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PageHeader>

      <div className="relative space-y-6 pt-4">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--shell-bg)]/60 backdrop-blur-[1px]">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          </div>
        )}

        {error && !loading && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-rose-400">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-4 rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm hover:bg-[var(--shell-surface)]"
              >
                Réessayer
              </button>
            </CardContent>
          </Card>
        )}

        {stats && activeTab === "synthese" && (
          <>
            <DashboardMetricsRow>
              <MetricCard tone="sky" icon={Users} label="Total employés" value={stats.summary.total} />
              <MetricCard tone="emerald" icon={UserCheck} label="Actifs" value={stats.summary.active} />
              <MetricCard
                tone="cyan"
                icon={ArrowUpRight}
                label={entreesLabel}
                value={stats.summary.entrees}
                hint={stats.periodLabel}
              />
              <MetricCard
                tone="rose"
                icon={ArrowDownLeft}
                label={sortiesLabel}
                value={stats.summary.sorties}
                hint={stats.periodLabel}
              />
              <MetricCard
                tone="indigo"
                icon={Users}
                label="Effectif fin période"
                value={stats.summary.effectifFinPeriode}
                hint={stats.periodLabel}
              />
              <MetricCard
                tone="amber"
                icon={GitBranch}
                label="Sans poste affecté"
                value={stats.summary.unassigned}
              />
              <MetricCard tone="violet" icon={Building2} label="Départements" value={stats.summary.departmentCount} />
              <MetricCard tone="cyan" icon={UserPlus} label="Candidats" value={stats.summary.candidates} />
              <MetricCard tone="violet" icon={Hourglass} label="En période d'essai" value={stats.summary.onTrial} />
              <MetricCard
                tone="sky"
                icon={ClipboardCheck}
                label="Complétion dossier moy."
                value={`${stats.summary.avgDossierCompletion}%`}
              />
              <MetricCard
                tone="orange"
                icon={TrendingUp}
                label="Turnover"
                value={`${stats.summary.turnoverRate.toFixed(1)}%`}
                hint="Sortis / total"
              />
            </DashboardMetricsRow>

            <Card>
              <CardHeader className="pb-2">
                <h2 className="font-semibold text-[var(--shell-text)]">Évolution des effectifs</h2>
                <p className="text-xs text-[var(--shell-text-muted)]">
                  Effectif, entrées et sorties par mois — {stats.year}
                </p>
              </CardHeader>
              <CardContent className="pt-0 min-h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.headcountTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                    <XAxis dataKey="month" stroke={chartUi.axis} fontSize={11} />
                    <YAxis stroke={chartUi.axis} fontSize={11} />
                    <Tooltip contentStyle={chartUi.tooltip} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="effectif"
                      name="Effectif"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="entrees"
                      name="Entrées"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="sorties"
                      name="Sorties"
                      stroke="#ef4444"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <SectionQuickLinks
              links={[
                {
                  href: "/employes/nouveau",
                  title: "Nouvel employé",
                  description: "Créer une fiche agent",
                  icon: "user-plus",
                  accent: "text-emerald-400",
                },
                {
                  href: "/employes",
                  title: "Liste",
                  description: "Cartes ou tableau filtrable",
                  icon: "list",
                  accent: "text-indigo-400",
                },
                {
                  href: "/employes/departements",
                  title: "Départements",
                  description: "Effectifs par service",
                  icon: "building-2",
                  accent: "text-violet-400",
                },
                {
                  href: "/mouvements",
                  title: "Mouvements",
                  description: "Affectations et changements de poste",
                  icon: "git-branch",
                  accent: "text-rose-400",
                },
              ]}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="pt-4">
                  <h2 className="text-sm font-semibold text-[var(--shell-text)] mb-3">
                    Effectifs par département
                  </h2>
                  <ul className="space-y-2">
                    {stats.byDepartmentTop.map((d) => (
                      <li
                        key={d.department}
                        className="flex justify-between text-sm border-b border-[var(--shell-border)] pb-2"
                      >
                        <span className="text-[var(--shell-text-muted)]">{d.department}</span>
                        <span className="font-medium text-[var(--shell-text)]">{d.count}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <h2 className="text-sm font-semibold text-[var(--shell-text)] mb-3">
                    Répartition par statut
                  </h2>
                  <ul className="space-y-2">
                    {stats.byStatus.map((s) => (
                      <li
                        key={s.status}
                        className="flex justify-between text-sm border-b border-[var(--shell-border)] pb-2"
                      >
                        <span className="text-[var(--shell-text-muted)]">{s.label}</span>
                        <span className="font-medium text-[var(--shell-text)]">{s.count}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {stats.recentHires.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <h2 className="text-sm font-semibold text-[var(--shell-text)] mb-3">
                    Embauches — {stats.periodLabel}
                  </h2>
                  <ul className="space-y-2">
                    {stats.recentHires.map((e) => (
                      <li
                        key={e.id}
                        className="flex justify-between text-sm border-b border-[var(--shell-border)] pb-2"
                      >
                        <Link href={employeeDossierHref(e.id)} className="text-sky-400 hover:underline">
                          {e.name}
                        </Link>
                        <span className="text-[var(--shell-text-muted)] text-xs">
                          {e.department}
                          {e.hireDate ? ` · ${formatDate(e.hireDate)}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {stats && activeTab === "analyses" && (
          <>
            <DashboardMetricsRow>
              <MetricCard tone="sky" icon={Users} label="Effectif actif" value={stats.summary.active} />
              <MetricCard
                tone="indigo"
                icon={Building2}
                label="Départements"
                value={stats.summary.departmentCount}
                hint="Services actifs"
              />
              <MetricCard
                tone="violet"
                icon={ClipboardCheck}
                label="Dossiers"
                value={`${stats.summary.avgDossierCompletion}%`}
                hint="Complétude moy."
              />
              <MetricCard
                tone="cyan"
                icon={UserPlus}
                label="Candidats"
                value={stats.summary.candidates}
                hint={`${stats.summary.onTrial} en essai`}
              />
              <MetricCard tone="amber" icon={GitBranch} label="Non affectés" value={stats.summary.unassigned} />
              <MetricCard
                tone="orange"
                icon={TrendingUp}
                label="Turnover"
                value={`${stats.summary.turnoverRate.toFixed(1)}%`}
                hint="Sortis / total"
              />
              <MetricCard
                tone="emerald"
                icon={ArrowUpRight}
                label={entreesLabel}
                value={stats.summary.entrees}
              />
              <MetricCard
                tone="rose"
                icon={ArrowDownLeft}
                label={sortiesLabel}
                value={stats.summary.sorties}
              />
            </DashboardMetricsRow>
            <EmployesDashboardCharts stats={stats} chartUi={chartUi} />
          </>
        )}
      </div>
    </div>
  );
}
