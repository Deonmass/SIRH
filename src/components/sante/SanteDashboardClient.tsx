"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardMetricsRow, MetricCard } from "@/components/dashboard/DashboardMetricsRow";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Hopital } from "@/lib/repositories/hopitaux";
import type { SanteDashboardData } from "@/lib/sante-dashboard";
import { MOIS_FR_OPTIONS } from "@/lib/pointage-utils";
import { useLayout } from "@/contexts/LayoutContext";

const chartUiDark = {
  grid: "#334155",
  axis: "#94a3b8",
  tooltip: { background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" },
};

const chartUiLight = {
  grid: "#e2e8f0",
  axis: "#64748b",
  tooltip: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    color: "#0f172a",
  },
};

const PIE_COLORS = ["#38bdf8", "#10b981", "#f59e0b", "#a78bfa", "#f43f5e", "#64748b"];
const VALIDATION_COLORS: Record<string, string> = {
  en_attente: "#f59e0b",
  valide: "#10b981",
  rejete: "#f43f5e",
};

function formatMontant(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function SanteDashboardClient() {
  const { theme } = useLayout();
  const chartUi = theme === "light" ? chartUiLight : chartUiDark;
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | "">("");
  const [date, setDate] = useState("");
  const [hopital, setHopital] = useState("");
  const [hopitaux, setHopitaux] = useState<Hopital[]>([]);
  const [data, setData] = useState<SanteDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("year", String(year));
    if (month !== "") params.set("month", String(month));
    if (date) params.set("date", date);
    if (hopital) params.set("hopital", hopital);
    return params.toString();
  }, [year, month, date, hopital]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sante/dashboard?${query}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void fetch("/api/sante/hopitaux")
      .then((r) => (r.ok ? r.json() : []))
      .then(setHopitaux);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return Array.from({ length: 5 }, (_, i) => y - i);
  }, [now]);

  const filterControls = (
    <div className="flex flex-wrap items-end justify-end gap-2">
      <label className="text-sm">
        <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Année</span>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2.5 py-2 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Mois</span>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value === "" ? "" : Number(e.target.value))}
          className="min-w-[7.5rem] rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2.5 py-2 text-sm"
        >
          <option value="">Tous</option>
          {MOIS_FR_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2.5 py-2 text-sm"
        />
      </label>

      <label className="min-w-[9rem] text-sm">
        <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Hôpital</span>
        <select
          value={hopital}
          onChange={(e) => setHopital(e.target.value)}
          className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2.5 py-2 text-sm"
        >
          <option value="">Tous</option>
          {hopitaux.map((h) => (
            <option key={h.id} value={h.hopital}>
              {h.hopital}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => {
          setMonth("");
          setDate("");
          setHopital("");
        }}
        className="rounded-lg border border-[var(--shell-border)] px-2.5 py-2 text-xs hover:bg-[var(--shell-hover)]"
      >
        Réinitialiser
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard santé"
        description="Indicateurs, visites médicales et dépenses hôpitaux affiliés"
      >
        {filterControls}
      </PageHeader>

      {loading || !data ? (
        <div className="space-y-6">
          <DashboardMetricsRow>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="min-h-[108px] rounded-xl" />
            ))}
          </DashboardMetricsRow>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : (
        <>
          <DashboardMetricsRow>
            <MetricCard
              tone="sky"
              icon={Activity}
              label="Total visites"
              value={data.kpi.totalVisites}
            />
            <MetricCard
              tone="emerald"
              icon={DollarSign}
              label="Montant total"
              value={formatMontant(data.kpi.montantTotal)}
            />
            <MetricCard
              tone="amber"
              icon={Clock}
              label="En attente"
              value={data.kpi.enAttente}
            />
            <MetricCard
              tone="indigo"
              icon={CheckCircle2}
              label="Validées"
              value={data.kpi.validees}
            />
            <MetricCard
              tone="rose"
              icon={XCircle}
              label="Rejetées"
              value={data.kpi.rejetees}
            />
          </DashboardMetricsRow>

          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="h-5 w-5 text-sky-500" />
                Évolution des visites par mois
              </h2>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={data.visitesParMois} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="label" stroke={chartUi.axis} fontSize={12} />
                  <YAxis stroke={chartUi.axis} fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Nombre de visites"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#38bdf8" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4 text-sky-500" />
                  Top 5 agents (visites)
                </h2>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.topAgents} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                    <XAxis type="number" stroke={chartUi.axis} fontSize={11} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="matricule"
                      stroke={chartUi.axis}
                      fontSize={10}
                      width={90}
                    />
                    <Tooltip contentStyle={chartUi.tooltip} />
                    <Bar dataKey="count" name="Visites" fill="#38bdf8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="flex items-center gap-2 font-semibold">
                  <Building2 className="h-4 w-4 text-emerald-500" />
                  Top 5 hôpitaux (factures)
                </h2>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.topHopitaux} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                    <XAxis
                      dataKey="hopital"
                      stroke={chartUi.axis}
                      fontSize={10}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke={chartUi.axis} fontSize={11} />
                    <Tooltip
                      contentStyle={chartUi.tooltip}
                      formatter={(value) =>
                        typeof value === "number" ? formatMontant(value) : String(value ?? "")
                      }
                    />
                    <Legend />
                    <Bar dataKey="montant" name="Montant ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="count" name="Visites" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Montants par mois</h2>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.visitesParMois}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                    <XAxis dataKey="label" stroke={chartUi.axis} fontSize={11} />
                    <YAxis stroke={chartUi.axis} fontSize={11} />
                    <Tooltip
                      contentStyle={chartUi.tooltip}
                      formatter={(value) =>
                        typeof value === "number" ? formatMontant(value) : String(value ?? "")
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="montant"
                      name="Montant"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold">Répartition par statut</h2>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.repartitionValidation}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(props) => {
                        const label = String(props.name ?? "");
                        const count = props.value ?? 0;
                        return `${label}: ${count}`;
                      }}
                    >
                      {data.repartitionValidation.map((entry) => (
                        <Cell
                          key={entry.statut}
                          fill={VALIDATION_COLORS[entry.statut] ?? "#64748b"}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartUi.tooltip} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">Répartition par hôpital</h2>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.repartitionHopital}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="hopital" stroke={chartUi.axis} fontSize={10} />
                  <YAxis stroke={chartUi.axis} fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="count" name="Visites" radius={[4, 4, 0, 0]}>
                    {data.repartitionHopital.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
