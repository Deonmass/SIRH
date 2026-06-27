"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Car,
  ClipboardList,
  Gauge,
  Loader2,
  Route,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FolderTabs } from "@/components/layout/FolderTabs";
import { CharroiDeclarationDashboard } from "@/components/charroi/CharroiDeclarationDashboard";
import {
  CharroiDashboardCoursesTab,
  CharroiDashboardEntretiensTab,
  CharroiDashboardPannesTab,
} from "@/components/charroi/CharroiDashboardTabContent";
import { DashboardMetricsRow, MetricCard } from "@/components/dashboard/DashboardMetricsRow";
import type { CharroiDashboardTabs } from "@/lib/charroi-dashboard-detail";
import { formatKm, type EntretienSuiviRow } from "@/lib/charroi-entretien";
import type { DeclarationDashboardStats } from "@/lib/charroi-vehicule-declaration";
import { MOIS_FR_OPTIONS } from "@/lib/pointage-utils";
import { cn } from "@/lib/utils";

interface Stats {
  vehiculesTotal: number;
  vehiculesDisponibles: number;
  demandesEnAttente: number;
  coursesEnCours: number;
  entretienEnRetard: number;
  entretienAPlanifier: number;
  vehiculesEnPanne: number;
  kmParcoursMois: number;
  alertesEntretien: EntretienSuiviRow[];
  declaration?: DeclarationDashboardStats;
  tabs?: CharroiDashboardTabs;
}

type TabId = "synthese" | "courses" | "entretiens" | "pannes";

const selectClass =
  "rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2.5 py-2 text-sm";

export function CharroiDashboardClient() {
  const now = useMemo(() => new Date(), []);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [activeTab, setActiveTab] = useState<TabId>("synthese");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return Array.from({ length: 6 }, (_, i) => y - i);
  }, [now]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(filterYear) });
      if (filterMonth !== "") params.set("month", String(filterMonth));
      const res = await fetch(`/api/charroi/dashboard?${params}`);
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  const kmLabel =
    filterMonth === "" ? "Km parcourus (année)" : "Km parcourus (mois)";

  const hasEntretienAlerts =
    (stats?.entretienEnRetard ?? 0) > 0 || (stats?.entretienAPlanifier ?? 0) > 0;

  const tabs = useMemo(
    () => [
      { id: "synthese" as const, label: "Synthèse" },
      {
        id: "courses" as const,
        label: "Courses",
        count: stats?.tabs?.courses.total,
      },
      {
        id: "entretiens" as const,
        label: "Entretiens",
        count:
          (stats?.tabs?.entretiens.enRetard ?? 0) +
          (stats?.tabs?.entretiens.aPlanifier ?? 0),
      },
      {
        id: "pannes" as const,
        label: "Pannes",
        count: stats?.tabs?.pannes.eventsPeriode,
      },
    ],
    [stats?.tabs]
  );

  return (
    <div>
      <PageHeader
        title="Charroi automobile"
        description="Parc véhicules, entretien, types de course et planning"
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

      <div className="pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          </div>
        ) : (
          <>
            {activeTab === "synthese" && (
              <>
                <DashboardMetricsRow className="mb-6">
                  <MetricCard tone="sky" icon={Car} label="Véhicules" value={stats?.vehiculesTotal ?? 0} />
                  <MetricCard
                    tone="emerald"
                    icon={Car}
                    label="Disponibles"
                    value={stats?.vehiculesDisponibles ?? 0}
                  />
                  <MetricCard
                    tone="amber"
                    icon={ClipboardList}
                    label="Demandes en attente"
                    value={stats?.demandesEnAttente ?? 0}
                  />
                  <MetricCard
                    tone="indigo"
                    icon={Route}
                    label="Courses en cours"
                    value={stats?.coursesEnCours ?? 0}
                  />
                </DashboardMetricsRow>

                {stats?.declaration && stats.declaration.total > 0 && (
                  <CharroiDeclarationDashboard data={stats.declaration} />
                )}

                <h2 className="mb-3 text-sm font-semibold text-[var(--shell-text-muted)]">
                  Suivi entretien & maintenance
                </h2>
                <DashboardMetricsRow className="mb-8">
                  <MetricCard
                    tone="rose"
                    icon={AlertTriangle}
                    label="Entretien en retard"
                    value={stats?.entretienEnRetard ?? 0}
                  />
                  <MetricCard
                    tone="amber"
                    icon={Gauge}
                    label="À planifier"
                    value={stats?.entretienAPlanifier ?? 0}
                  />
                  <MetricCard
                    tone="orange"
                    icon={Wrench}
                    label="En panne"
                    value={stats?.vehiculesEnPanne ?? 0}
                  />
                  <MetricCard
                    tone="cyan"
                    icon={Route}
                    label={kmLabel}
                    value={formatKm(stats?.kmParcoursMois ?? 0)}
                  />
                </DashboardMetricsRow>

                {hasEntretienAlerts && (stats?.alertesEntretien?.length ?? 0) > 0 && (
                  <section className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        Alertes gestionnaire
                      </h3>
                      <Link
                        href="/charroi/vehicules?tab=entretien"
                        className="text-xs font-medium text-sky-500 hover:underline"
                      >
                        Ouvrir le suivi entretien →
                      </Link>
                    </div>
                    <ul className="space-y-2">
                      {stats!.alertesEntretien.map((row) => (
                        <li
                          key={row.vehiculeId}
                          className={cn(
                            "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                            row.alertLevel === "overdue"
                              ? "border-red-500/30 bg-red-500/5"
                              : "border-amber-500/30 bg-[var(--shell-bg)]/60"
                          )}
                        >
                          <div>
                            <span className="font-mono font-semibold">{row.plaque}</span>
                            <span className="ml-2 text-[var(--shell-text-muted)]">
                              {[row.marque, row.vehicleType].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                          <div className="text-right text-xs">
                            <div
                              className={cn(
                                "font-medium",
                                row.alertLevel === "overdue"
                                  ? "text-red-500"
                                  : "text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {row.alertLabel}
                            </div>
                            <div className="text-[var(--shell-text-muted)]">
                              Km actuel : {formatKm(row.kmActuel)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { href: "/charroi/vehicules", label: "Véhicules", desc: "Liste du parc" },
                    {
                      href: "/charroi/vehicules?tab=entretien",
                      label: "Suivi entretien",
                      desc: "Kilométrage et alertes",
                    },
                    {
                      href: "/charroi/planning?types=1",
                      label: "Types de course",
                      desc: "Référentiel",
                    },
                    {
                      href: "/charroi/planning",
                      label: "Planning véhicule",
                      desc: "Demandes et affectations",
                    },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 transition hover:border-sky-500/40 hover:bg-[var(--shell-hover)]"
                    >
                      <p className="font-semibold text-[var(--shell-text)]">{item.label}</p>
                      <p className="mt-1 text-sm text-[var(--shell-text-muted)]">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {activeTab === "courses" && stats?.tabs?.courses && (
              <CharroiDashboardCoursesTab data={stats.tabs.courses} kmLabel={kmLabel} />
            )}

            {activeTab === "entretiens" && stats?.tabs?.entretiens && (
              <CharroiDashboardEntretiensTab data={stats.tabs.entretiens} />
            )}

            {activeTab === "pannes" && stats?.tabs?.pannes && (
              <CharroiDashboardPannesTab data={stats.tabs.pannes} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
