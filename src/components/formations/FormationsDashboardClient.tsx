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
import { GraduationCap, Users, CalendarClock, CheckCircle2 } from "lucide-react";
import { DashboardMetricsRow, MetricCard } from "@/components/dashboard/DashboardMetricsRow";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { FormationsDashboardData } from "@/lib/formations-dashboard";
import { formationStatusBadgeClass, formationStatusLabel } from "@/lib/formations-utils";
import { useLayout } from "@/contexts/LayoutContext";
import { formatDate } from "@/lib/utils";

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

export function FormationsDashboardClient({ year }: { year: number }) {
  const { theme } = useLayout();
  const chartUi = theme === "light" ? chartUiLight : chartUiDark;
  const [data, setData] = useState<FormationsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/formations/dashboard?year=${year}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [year]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <DashboardMetricsRow>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="min-h-[108px] rounded-xl" />
          ))}
        </DashboardMetricsRow>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardMetricsRow>
        <MetricCard
          tone="indigo"
          icon={GraduationCap}
          label="Total formations"
          value={data.total}
        />
        <MetricCard tone="cyan" icon={CalendarClock} label="À venir" value={data.aVenir} />
        <MetricCard tone="amber" icon={Users} label="En cours" value={data.enCours} />
        <MetricCard tone="emerald" icon={CheckCircle2} label="Terminées" value={data.terminees} />
      </DashboardMetricsRow>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-[var(--shell-text)]">
            Tendance mensuelle ({year})
          </h2>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.monthlyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
              <XAxis dataKey="month" stroke={chartUi.axis} fontSize={11} />
              <YAxis stroke={chartUi.axis} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={chartUi.tooltip} />
              <Legend />
              <Line
                type="monotone"
                dataKey="aVenir"
                name="À venir"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="enCours"
                name="En cours"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="terminees"
                name="Terminées"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80 p-4">
        <h3 className="mb-3 text-sm font-semibold">Prochaines formations</h3>
        {data.upcoming.length === 0 ? (
          <p className="text-sm text-[var(--shell-text-muted)]">Aucune formation à venir.</p>
        ) : (
          <ul className="space-y-2">
            {data.upcoming.map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{f.titre}</p>
                  <p className="text-xs text-[var(--shell-text-muted)]">
                    {formatDate(f.dateDebut)} – {formatDate(f.dateFin)} · {f.participantCount} participant
                    {f.participantCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${formationStatusBadgeClass(f.status)}`}
                >
                  {formationStatusLabel(f.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/formations/gestion" className="mt-3 inline-block text-xs text-sky-400 hover:underline">
          Voir toutes les formations →
        </Link>
      </div>

      <p className="text-xs text-[var(--shell-text-muted)]">
        {data.totalParticipants} participant{data.totalParticipants !== 1 ? "s" : ""} inscrit
        {data.totalParticipants !== 1 ? "s" : ""} au total.
      </p>
    </div>
  );
}
