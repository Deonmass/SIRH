"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { CongesCalendarPanel } from "./CongesCalendarPanel";
import type {
  CongesCalendarDay,
  CongesDeptRow,
  CongesMonthlyPoint,
  CongesTypeRow,
} from "@/lib/conges-dashboard";
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS } from "@/lib/employee-dossier";
import { useLayout } from "@/contexts/LayoutContext";
import { cn, formatDate } from "@/lib/utils";

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

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function CongesDashboardClient({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const { theme } = useLayout();
  const chartUi = theme === "light" ? chartUiLight : chartUiDark;
  const [loading, setLoading] = useState(true);
  const [monthlyTrend, setMonthlyTrend] = useState<CongesMonthlyPoint[]>([]);
  const [byDepartment, setByDepartment] = useState<CongesDeptRow[]>([]);
  const [byType, setByType] = useState<CongesTypeRow[]>([]);
  const [calendarDays, setCalendarDays] = useState<CongesCalendarDay[]>([]);
  const [deptModal, setDeptModal] = useState<CongesDeptRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conges/dashboard?year=${year}&month=${month}`);
      const data = await res.json();
      setMonthlyTrend(data.monthlyTrend ?? []);
      setByDepartment(data.byDepartment ?? []);
      setByType(data.byType ?? []);
      setCalendarDays(data.calendarDays ?? []);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-[var(--shell-text)]">
            Congés par mois — {year}
          </h2>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                <XAxis dataKey="month" stroke={chartUi.axis} fontSize={11} />
                <YAxis stroke={chartUi.axis} fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={chartUi.tooltip} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="enConge"
                  name="Agents en congé"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="demandes"
                  name="Demandes"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="approuves"
                  name="Approuvés"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--shell-text)]">
              Départements — {MONTHS[month]} {year}
            </h3>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto pt-0">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--shell-border)] text-left text-xs text-[var(--shell-text-muted)]">
                    <th className="pb-2 font-medium">Département</th>
                    <th className="pb-2 text-right font-medium">Agents</th>
                    <th className="pb-2 text-right font-medium">En congé</th>
                  </tr>
                </thead>
                <tbody>
                  {byDepartment.map((row) => (
                    <tr
                      key={row.department}
                      className="cursor-pointer border-b border-[var(--shell-border)]/60 hover:bg-[var(--shell-hover)]"
                      onClick={() => setDeptModal(row)}
                    >
                      <td className="py-2 pr-2 text-sky-500">{row.department}</td>
                      <td className="py-2 text-right tabular-nums">{row.count}</td>
                      <td className="py-2 text-right tabular-nums text-sky-500">{row.onLeave}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--shell-text)]">
              Congés par type — {MONTHS[month]} {year}
            </h3>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto pt-0">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--shell-border)] text-left text-xs text-[var(--shell-text-muted)]">
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 text-right font-medium">Nb</th>
                    <th className="pb-2 text-right font-medium">Jours</th>
                  </tr>
                </thead>
                <tbody>
                  {byType.map((row) => (
                    <tr key={row.type} className="border-b border-[var(--shell-border)]/60">
                      <td className="py-2">{row.label}</td>
                      <td className="py-2 text-right tabular-nums">{row.count}</td>
                      <td className="py-2 text-right tabular-nums">{row.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--shell-text)]">
              Calendrier — {MONTHS[month]} {year}
            </h3>
            <p className="text-xs text-[var(--shell-text-muted)]">
              Survolez une date pour voir les agents en congé
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <CongesCalendarPanel days={calendarDays} year={year} month={month} />
            )}
          </CardContent>
        </Card>
      </div>

      {deptModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setDeptModal(null)}
        >
          <div
            className="max-h-[min(80vh,32rem)] w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--shell-border)] px-4 py-3">
              <h3 className="font-semibold text-[var(--shell-text)]">{deptModal.department}</h3>
              <p className="text-xs text-[var(--shell-text-muted)]">
                {MONTHS[month]} {year} — {deptModal.agents.length} agent(s) en congé
              </p>
            </div>
            <div className="max-h-[calc(min(80vh,32rem)-4rem)] overflow-y-auto p-4">
              {deptModal.agents.length === 0 ? (
                <p className="text-sm text-[var(--shell-text-muted)]">Aucun congé ce mois.</p>
              ) : (
                <ul className="space-y-3">
                  {deptModal.agents.map((agent) => (
                    <li
                      key={agent.employeeId || agent.matricule}
                      className="rounded-lg border border-[var(--shell-border)] p-3"
                    >
                      <p className="font-medium text-[var(--shell-text)]">{agent.employeeName}</p>
                      <p className="text-xs text-[var(--shell-text-muted)]">{agent.matricule}</p>
                      <ul className="mt-2 space-y-1.5 text-xs">
                        {agent.leaves.map((l) => (
                          <li
                            key={l.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-[var(--shell-text-muted)]"
                          >
                            <span>
                              {LEAVE_TYPE_LABELS[l.type]} — {formatDate(l.startDate)} →{" "}
                              {formatDate(l.endDate)}
                            </span>
                            <span className={cn("tabular-nums", "text-sky-500")}>
                              {l.days} j · {LEAVE_STATUS_LABELS[l.status]}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-[var(--shell-border)] px-4 py-2 text-right">
              <button
                type="button"
                onClick={() => setDeptModal(null)}
                className="rounded-lg border border-[var(--shell-border)] px-3 py-1.5 text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
