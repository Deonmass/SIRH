"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PaieMasseMonthlyPoint } from "@/lib/paie-masse";
import { useLayout } from "@/contexts/LayoutContext";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const SERIES = [
  { key: "totalNet", name: "Masse nette", color: "#10b981" },
  { key: "totalGross", name: "Masse brute", color: "#0ea5e9" },
  { key: "totalDecaissement", name: "Décaissement", color: "#14b8a6" },
  { key: "totalCnss", name: "CNSS (total)", color: "#6366f1" },
  { key: "totalIpr", name: "IRPP / DGI", color: "#f59e0b" },
  { key: "totalOnem", name: "ONEM", color: "#ec4899" },
  { key: "totalInpp", name: "INPP", color: "#8b5cf6" },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

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

function axisAmount(v: number): string {
  if (!v || v === 0) return "";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

function labelAmount(v: number, currency: string): string {
  if (!v || v === 0) return "";
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${currency}`;
}

export function PaieMasseAnnualChart({ year }: { year: number }) {
  const { theme } = useLayout();
  const chartUi = theme === "light" ? chartUiLight : chartUiDark;
  const [series, setSeries] = useState<PaieMasseMonthlyPoint[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());

  useEffect(() => {
    setLoading(true);
    setHidden(new Set());
    fetch(`/api/paie/masse/annual?year=${year}`)
      .then((r) => r.json())
      .then((data: { series: PaieMasseMonthlyPoint[]; currency: string }) => {
        setSeries(data.series ?? []);
        setCurrency(data.currency ?? "USD");
      })
      .finally(() => setLoading(false));
  }, [year]);

  const data = useMemo(
    () =>
      series.map((p) => ({
        ...p,
        name: p.monthLabel,
      })),
    [series]
  );

  const formatValue = (v: number) =>
    `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${currency}`;

  const toggleSeries = useCallback((key: SeriesKey) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <Card>
      <CardHeader className="border-b border-[var(--shell-border)] pb-4">
        <div className="flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-sky-500" />
          <div>
            <h2 className="text-sm font-bold text-[var(--shell-text)]">
              Évolution annuelle {year}
            </h2>
            <p className="text-xs text-[var(--shell-text-muted)]">
              Cliquez sur une légende pour masquer/afficher une courbe · montants sur les points
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <Skeleton className="h-72 w-full rounded-lg" />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {SERIES.map((s) => {
                const isHidden = hidden.has(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleSeries(s.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition",
                      isHidden
                        ? "border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--shell-text-muted)] opacity-50 line-through"
                        : "border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--shell-text)]"
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: isHidden ? "#94a3b8" : s.color }}
                    />
                    {s.name}
                  </button>
                );
              })}
            </div>
            <div className="h-[22rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 28, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis
                    dataKey="monthLabel"
                    stroke={chartUi.axis}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={chartUi.axis}
                    fontSize={10}
                    tickFormatter={axisAmount}
                  />
                  <Tooltip
                    contentStyle={chartUi.tooltip}
                    formatter={(value, name) => {
                      const num = typeof value === "number" ? value : 0;
                      const label = SERIES.find((s) => s.key === name)?.name ?? String(name);
                      return [formatValue(num), label];
                    }}
                    labelFormatter={(label) => `Mois : ${label}`}
                  />
                  {SERIES.map((s) =>
                    hidden.has(s.key) ? null : (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.key}
                        stroke={s.color}
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2, fill: s.color }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={false}
                      >
                        <LabelList
                          dataKey={s.key}
                          position="top"
                          offset={12}
                          formatter={(v) => labelAmount(Number(v), currency)}
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            fill: s.color,
                          }}
                        />
                      </Line>
                    )
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
