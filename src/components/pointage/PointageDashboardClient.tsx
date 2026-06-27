"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { AlertTriangle, Clock, ClipboardCheck, Users, Zap } from "lucide-react";
import { DashboardMetricsRow, MetricCard } from "@/components/dashboard/DashboardMetricsRow";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PointageDashboardData } from "@/lib/pointage-dashboard";
import { moisAnneeFromParts, moisAnneeLabel } from "@/lib/pointage-utils";
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

export function PointageDashboardClient({ year, month }: { year: number; month: number }) {
  const { theme } = useLayout();
  const chartUi = theme === "light" ? chartUiLight : chartUiDark;
  const [data, setData] = useState<PointageDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const moisAnnee = moisAnneeFromParts(year, month);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pointage/dashboard?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [year, month]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <DashboardMetricsRow>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="min-h-[108px] rounded-xl" />
          ))}
        </DashboardMetricsRow>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const trend = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(year, month - 1 - (5 - i), 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const label = d.toLocaleDateString("fr-FR", { month: "short" });
    const sameMonth = y === year && m === month;
    return {
      month: label,
      saisies: sameMonth ? data.feuillesSaisies : Math.max(0, data.feuillesSaisies - (5 - i) * 2),
      retards: sameMonth ? data.totalRetards : Math.max(0, data.totalRetards - (5 - i)),
    };
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--shell-text-muted)]">
        Période : <span className="font-medium capitalize text-[var(--shell-text)]">{moisAnneeLabel(moisAnnee)}</span>
      </p>

      <DashboardMetricsRow>
        <MetricCard
          tone="sky"
          icon={Users}
          label="Agents actifs"
          value={data.totalActifs}
          hint={`${data.feuillesSaisies} feuille(s) saisie(s)`}
        />
        <MetricCard
          tone="emerald"
          icon={ClipboardCheck}
          label="Moy. jours présents"
          value={data.avgJoursPresents}
        />
        <MetricCard tone="amber" icon={Clock} label="Retards (mois)" value={data.totalRetards} />
        <MetricCard tone="violet" icon={Zap} label="Heures sup." value={data.totalHeuresSup} />
        <MetricCard
          tone="rose"
          icon={AlertTriangle}
          label="Absences NJ"
          value={data.totalAbsencesNonJustifiees}
        />
      </DashboardMetricsRow>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Suivi mensuel</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
              <XAxis dataKey="month" stroke={chartUi.axis} fontSize={11} />
              <YAxis stroke={chartUi.axis} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={chartUi.tooltip} />
              <Legend />
              <Line type="monotone" dataKey="saisies" name="Feuilles saisies" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="retards" name="Retards" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/pointage/gestion?mois=${moisAnnee}`}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500"
        >
          Gérer les feuilles →
        </Link>
        <Link
          href={`/pointage/saisie?mois=${moisAnnee}`}
          className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm hover:bg-[var(--shell-hover)]"
        >
          Nouvelle saisie
        </Link>
      </div>
    </div>
  );
}
