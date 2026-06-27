"use client";

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
import { GridCards } from "@/components/ui/Grid8";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { EmployesDashboardDetail } from "@/lib/employes-dashboard-detail";

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

type ChartUi = {
  grid: string;
  axis: string;
  tooltip: React.CSSProperties;
};

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <h2 className="font-semibold text-[var(--shell-text)]">{title}</h2>
        <p className="text-xs text-[var(--shell-text-muted)]">{subtitle}</p>
      </CardHeader>
      <CardContent className="pt-0 min-h-[280px]">{children}</CardContent>
    </Card>
  );
}

export function EmployesDashboardCharts({
  stats,
  chartUi,
}: {
  stats: EmployesDashboardDetail;
  chartUi: ChartUi;
}) {
  return (
    <GridCards cols={2} className="lg:grid-cols-2">
      <ChartCard title="Effectifs par département" subtitle="Hors sortis / licenciés">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.byDepartment} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
            <XAxis type="number" stroke={chartUi.axis} fontSize={11} />
            <YAxis dataKey="name" type="category" width={120} stroke={chartUi.axis} fontSize={10} />
            <Tooltip contentStyle={chartUi.tooltip} />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Répartition par sexe" subtitle="Parité & diversité">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={stats.bySexe} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
              {stats.bySexe.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={chartUi.tooltip} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Pyramide des âges" subtitle="Hommes vs Femmes par tranche">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.pyramideAges}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
            <XAxis dataKey="tranche" stroke={chartUi.axis} fontSize={11} />
            <YAxis stroke={chartUi.axis} fontSize={11} />
            <Tooltip contentStyle={chartUi.tooltip} />
            <Legend />
            <Bar dataKey="hommes" name="Hommes" fill="#3b82f6" stackId="a" />
            <Bar dataKey="femmes" name="Femmes" fill="#ec4899" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Balance d'ancienneté" subtitle="Répartition par ancienneté">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.bySeniority}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
            <XAxis dataKey="bracket" stroke={chartUi.axis} fontSize={11} />
            <YAxis stroke={chartUi.axis} fontSize={11} />
            <Tooltip contentStyle={chartUi.tooltip} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Par catégorie professionnelle" subtitle="Grille 1 à 7">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.byCategory}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
            <XAxis dataKey="label" stroke={chartUi.axis} fontSize={11} />
            <YAxis stroke={chartUi.axis} fontSize={11} />
            <Tooltip contentStyle={chartUi.tooltip} />
            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Par grade / niveau" subtitle="Classification interne">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.byGrade}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
            <XAxis dataKey="grade" stroke={chartUi.axis} fontSize={10} angle={-20} textAnchor="end" height={60} />
            <YAxis stroke={chartUi.axis} fontSize={11} />
            <Tooltip contentStyle={chartUi.tooltip} />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Pipeline recrutement" subtitle="Candidats → Actifs">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.recruitmentPipeline}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
            <XAxis dataKey="stage" stroke={chartUi.axis} fontSize={10} />
            <YAxis stroke={chartUi.axis} fontSize={11} />
            <Tooltip contentStyle={chartUi.tooltip} />
            <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Complétude dossiers"
        subtitle={`Moy. ${stats.summary.avgDossierCompletion}%`}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.dossierCompletion}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
            <XAxis dataKey="bracket" stroke={chartUi.axis} fontSize={11} />
            <YAxis stroke={chartUi.axis} fontSize={11} />
            <Tooltip contentStyle={chartUi.tooltip} />
            <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Mouvements RH" subtitle={`${stats.year} — types les plus fréquents`}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.movementSummary} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
            <XAxis type="number" stroke={chartUi.axis} fontSize={11} />
            <YAxis dataKey="label" type="category" width={130} stroke={chartUi.axis} fontSize={10} />
            <Tooltip contentStyle={chartUi.tooltip} />
            <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Statuts détaillés" subtitle="Tous statuts employés">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.byStatus}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
            <XAxis dataKey="label" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
            <YAxis stroke={chartUi.axis} fontSize={11} />
            <Tooltip contentStyle={chartUi.tooltip} />
            <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Entrées / sorties" subtitle={`Mouvements ${stats.periodLabel}`}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={stats.headcountTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
            <XAxis dataKey="month" stroke={chartUi.axis} fontSize={11} />
            <YAxis stroke={chartUi.axis} fontSize={11} />
            <Tooltip contentStyle={chartUi.tooltip} />
            <Legend />
            <Line type="monotone" dataKey="entrees" name="Entrées" stroke="#10b981" strokeWidth={2} />
            <Line type="monotone" dataKey="sorties" name="Sorties" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Évolution effectifs" subtitle={`Effectif fin de mois — ${stats.year}`}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={stats.headcountTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
            <XAxis dataKey="month" stroke={chartUi.axis} fontSize={11} />
            <YAxis stroke={chartUi.axis} fontSize={11} />
            <Tooltip contentStyle={chartUi.tooltip} />
            <Legend />
            <Line type="monotone" dataKey="effectif" name="Effectif" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </GridCards>
  );
}
