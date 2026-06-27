"use client";

import { useState } from "react";
import Link from "next/link";
import { employeeDossierHref } from "@/lib/employee-dossier-url";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  FileCheck,
  GraduationCap,
  LayoutDashboard,
  Shield,
  Target,
  TrendingUp,
  Users,
  UserPlus,
} from "lucide-react";
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
import { DashboardMetricsRow, MetricCard, type MetricTone } from "@/components/dashboard/DashboardMetricsRow";
import { FolderTabs } from "@/components/layout/FolderTabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Grid8, GridCards } from "@/components/ui/Grid8";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/SettingsContext";
import { useLayout } from "@/contexts/LayoutContext";
import type { GlobalDashboardStats } from "@/lib/global-dashboard";

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

type TabId =
  | "overview"
  | "effectifs"
  | "paie"
  | "conges"
  | "postes"
  | "formations"
  | "conformite";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Synthèse" },
  { id: "effectifs", label: "Effectifs" },
  { id: "paie", label: "Paie" },
  { id: "conges", label: "Congés" },
  { id: "postes", label: "Postes" },
  { id: "formations", label: "Formation" },
  { id: "conformite", label: "Conformité" },
];

export function DashboardView({ stats }: { stats: GlobalDashboardStats }) {
  const { formatSalary } = useAppSettings();
  const { theme } = useLayout();
  const { canHref } = useAuth();
  const chartUi = theme === "light" ? chartUiLight : chartUiDark;
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="space-y-0">
      <PageHeader
        title="Tableau de bord RH"
        description="Indicateurs consolidés — effectifs, paie, congés, conformité et opérationnel"
        className="!mb-0 !border-b-0"
        below={
          <FolderTabs
            tabs={TABS}
            active={activeTab}
            onChange={(id) => setActiveTab(id as TabId)}
            showCounts={false}
            variant="flat"
            className="px-8"
            barClassName="bg-[var(--shell-header-bg)]"
          />
        }
      />

      <div className="space-y-6 pt-4">
      {activeTab === "overview" && (
        <>
          <DashboardMetricsRow>
            <StatCard icon={Users} label="Effectif actif" value={String(stats.activeEmployees)} sub={`${stats.totalEmployees} total`} tone="sky" />
            <StatCard icon={UserPlus} label="En recrutement" value={String(stats.candidates + stats.onTrial)} sub={`${stats.candidates} cand.`} tone="cyan" />
            <StatCard icon={DollarSign} label="Masse brute" value={formatSalary(stats.totalGrossPayroll)} sub="Mensuel" tone="emerald" />
            <StatCard icon={TrendingUp} label="Turnover" value={`${stats.turnoverRate.toFixed(1)}%`} sub="Sortis/total" tone="orange" />
            <StatCard icon={Target} label="Perf. moy." value={stats.avgPerformance.toFixed(1)} sub="/5" tone="violet" />
            <StatCard icon={FileCheck} label="Conformité" value={`${Math.round(stats.documentComplianceRate)}%`} sub="Documents" tone="amber" />
            <StatCard icon={DollarSign} label="Coût employeur" value={formatSalary(stats.totalEmployerCost)} sub="Charges incl." tone="indigo" />
            <StatCard icon={Calendar} label="En congé" value={String(stats.onLeave)} sub={`${stats.conges.pendingValidations} à valider`} tone="cyan" />
          </DashboardMetricsRow>
          {stats.alerts.length > 0 && (
            <AlertsPanel stats={stats} canHref={canHref} />
          )}
          <GridCards cols={2} className="lg:grid-cols-2">
            <ChartCard title="Évolution effectifs" subtitle={`Entrées / sorties — ${stats.year}`}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.headcountTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="month" stroke={chartUi.axis} fontSize={11} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                  <Line type="monotone" dataKey="effectif" name="Effectif" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="entrees" name="Entrées" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="sorties" name="Sorties" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Masse salariale" subtitle={`Brut vs Net — ${stats.year}`}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.monthlyPayrollTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="month" stroke={chartUi.axis} fontSize={11} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                  <Bar dataKey="gross" name="Brut" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" name="Net" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Statuts employés" subtitle="Répartition globale">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={stats.byStatus.filter((s) => s.count > 0)} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label>
                    {stats.byStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartUi.tooltip} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Postes vacants" subtitle="Par département">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.postes.byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="department" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                  <Bar dataKey="vacant" name="Vacants" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="occupied" name="Occupés" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridCards>
          <QuickLinks />
        </>
      )}

      {activeTab === "effectifs" && (
        <>
          <DashboardMetricsRow>
            <StatCard icon={Users} label="Effectif actif" value={String(stats.activeEmployees)} sub={`${stats.employes.total} total`} tone="sky" />
            <StatCard icon={Briefcase} label="Départements" value={String(stats.employes.departmentCount)} sub="Services actifs" tone="indigo" />
            <StatCard icon={FileCheck} label="Dossiers" value={`${stats.employes.avgDossierCompletion}%`} sub="Complétude moy." tone="violet" />
            <StatCard icon={UserPlus} label="Candidats" value={String(stats.employes.candidates)} sub={`${stats.employes.onTrial} en essai`} tone="cyan" />
            <StatCard icon={Users} label="Non affectés" value={String(stats.employes.unassigned)} sub="Sans poste" tone="amber" />
            <StatCard icon={TrendingUp} label="Turnover" value={`${stats.turnoverRate.toFixed(1)}%`} sub="Sortis / total" tone="orange" />
            <StatCard icon={Calendar} label="En congé" value={String(stats.onLeave)} sub={`${stats.onNotice} préavis`} tone="emerald" />
            <StatCard icon={Target} label="Perf. moy." value={stats.avgPerformance.toFixed(1)} sub="/5" tone="violet" />
          </DashboardMetricsRow>
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
          <ChartCard title="Complétude dossiers" subtitle={`Moy. ${stats.employes.avgDossierCompletion}%`}>
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
              <BarChart data={stats.employes.byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                <XAxis dataKey="label" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                <YAxis stroke={chartUi.axis} fontSize={11} />
                <Tooltip contentStyle={chartUi.tooltip} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </GridCards>
        </>
      )}

      {activeTab === "paie" && (
        <>
          <DashboardMetricsRow>
            <StatCard icon={DollarSign} label="Masse brute" value={formatSalary(stats.totalGrossPayroll)} sub="Mensuelle" tone="emerald" />
            <StatCard icon={DollarSign} label="Net mensuel" value={formatSalary(stats.paieModule.totalNetMonthly)} sub={`${stats.paieModule.activeCount} actifs`} tone="sky" />
            <StatCard icon={DollarSign} label="Coût employeur" value={formatSalary(stats.totalEmployerCost)} sub="Charges incluses" tone="indigo" />
            <StatCard icon={DollarSign} label="Coûts extra" value={formatSalary(stats.paieModule.totalExtraCostsUsd)} sub={`Moy. ${formatSalary(stats.paieModule.avgExtraPerEmployee)}`} tone="amber" />
            <StatCard icon={Shield} label="CNSS" value={formatSalary(stats.paieCurrentMasse.totalCnssEmployee + stats.paieCurrentMasse.totalCnssEmployer)} sub="Salarié + employeur" tone="violet" />
            <StatCard icon={Target} label="IRPP / DGI" value={formatSalary(stats.paieCurrentMasse.totalIpr)} sub="Retenue mensuelle" tone="orange" />
            <StatCard icon={Users} label="Bulletins" value={String(stats.paieCurrentMasse.employeeCount)} sub={`${stats.paieModule.assignedCount} affectés`} tone="cyan" />
            <StatCard icon={TrendingUp} label="Décaissement" value={formatSalary(stats.paieCurrentMasse.totalNet + stats.paieCurrentMasse.totalExtraCosts)} sub="Net + extra" tone="emerald" />
          </DashboardMetricsRow>
          <GridCards cols={2} className="lg:grid-cols-2">
            <ChartCard title="Masse salariale annuelle" subtitle={`${stats.year} — brut, net, charges`}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.paieMasseSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="monthLabel" stroke={chartUi.axis} fontSize={11} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                  <Line type="monotone" dataKey="totalGross" name="Brut" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="totalNet" name="Net" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="totalEmployerCost" name="Coût employeur" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Charges sociales" subtitle="CNSS, ONEM, INPP, IRPP">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.paieMasseSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="monthLabel" stroke={chartUi.axis} fontSize={11} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                  <Bar dataKey="totalCnss" name="CNSS" fill="#6366f1" stackId="a" />
                  <Bar dataKey="totalIpr" name="IRPP" fill="#ef4444" stackId="a" />
                  <Bar dataKey="totalOnem" name="ONEM" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="totalInpp" name="INPP" fill="#10b981" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Net par département" subtitle="Période courante">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.paieByDepartment} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis type="number" stroke={chartUi.axis} fontSize={11} />
                  <YAxis dataKey="department" type="category" width={120} stroke={chartUi.axis} fontSize={10} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="net" name="Net" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Brut par département" subtitle="Période courante">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.paieByDepartment} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis type="number" stroke={chartUi.axis} fontSize={11} />
                  <YAxis dataKey="department" type="category" width={120} stroke={chartUi.axis} fontSize={10} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="gross" name="Brut" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Coûts extra par département" subtitle="USD — frais annexes">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.paieModule.byDepartmentExtra}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="department" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="total" name="Extra" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Coût employeur par département" subtitle="Salaire + charges patronales">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.paieByDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="department" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="employerCost" name="Coût employeur" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Décaissement mensuel" subtitle="Net + coûts extra">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.paieMasseSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="monthLabel" stroke={chartUi.axis} fontSize={11} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Line type="monotone" dataKey="totalDecaissement" name="Décaissement" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Effectif paiable" subtitle="Agents avec bulletin">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={[
                    { label: "Actifs paie", count: stats.paieModule.activeCount },
                    { label: "Affectés poste", count: stats.paieModule.assignedCount },
                    { label: "Bulletins période", count: stats.paieCurrentMasse.employeeCount },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="label" stroke={chartUi.axis} fontSize={11} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridCards>
        </>
      )}

      {activeTab === "conges" && (
        <>
          <DashboardMetricsRow>
            <StatCard icon={Calendar} label="En congé aujourd'hui" value={String(stats.conges.onLeaveNow)} sub="Agents absents" tone="cyan" />
            <StatCard icon={Clock} label="À valider" value={String(stats.conges.pendingValidations)} sub="Demandes en attente" tone="amber" />
            <StatCard icon={Target} label="Jours ce mois" value={String(stats.conges.totalDaysThisMonth)} sub="Tous types" tone="violet" />
            <StatCard icon={Users} label="Solde moyen" value={String(stats.leaveBalance.avgRemaining)} sub={`${stats.leaveBalance.highBalance} > 15 j`} tone="sky" />
            <StatCard icon={Users} label="Statut congé" value={String(stats.onLeave)} sub={`${stats.onNotice} préavis`} tone="emerald" />
            <StatCard icon={Calendar} label="Solde total" value={String(stats.leaveBalance.totalRemaining)} sub="Jours restants" tone="indigo" />
            <StatCard icon={AlertTriangle} label="Solde élevé" value={String(stats.leaveBalance.highBalance)} sub="Agents > 15 j" tone="orange" />
            <StatCard icon={FileCheck} label="Solde nul" value={String(stats.leaveBalance.zeroBalance)} sub="Agents à 0 j" tone="rose" />
          </DashboardMetricsRow>
          <GridCards cols={2} className="lg:grid-cols-2">
            <ChartCard title="Congés par mois" subtitle={`${stats.year} — agents en congé`}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.conges.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="month" stroke={chartUi.axis} fontSize={11} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                  <Line type="monotone" dataKey="enConge" name="En congé" stroke="#0ea5e9" strokeWidth={2} />
                  <Line type="monotone" dataKey="demandes" name="Demandes" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="approuves" name="Approuvés" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Congés par type" subtitle="Mois en cours — nombre">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.conges.byType.filter((t) => t.count > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="label" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="count" name="Demandes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Jours par type" subtitle="Mois en cours">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.conges.byType.filter((t) => t.days > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="label" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="days" name="Jours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Congés par département" subtitle="Agents en congé ce mois">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.conges.byDepartment.filter((d) => d.onLeave > 0).slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="department" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                  <Bar dataKey="count" name="Effectif dept." fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="onLeave" name="En congé" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Soldes congés" subtitle="Répartition des agents actifs">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { label: "Solde élevé (>15j)", count: stats.leaveBalance.highBalance },
                      { label: "Solde normal", count: Math.max(0, stats.paieModule.activeCount - stats.leaveBalance.highBalance - stats.leaveBalance.zeroBalance) },
                      { label: "Solde nul", count: stats.leaveBalance.zeroBalance },
                    ].filter((d) => d.count > 0)}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {[0, 1, 2].map((i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Statuts congé" subtitle="Agents avec statut « congé »">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={[{ label: "En congé (statut)", count: stats.onLeave }, { label: "Préavis", count: stats.onNotice }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="label" stroke={chartUi.axis} fontSize={11} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridCards>
        </>
      )}

      {activeTab === "postes" && (
        <>
          <DashboardMetricsRow>
            <StatCard icon={Briefcase} label="Postes actifs" value={String(stats.postes.total)} sub={`${stats.postes.departmentCount} départements`} tone="sky" />
            <StatCard icon={LayoutDashboard} label="Vacants" value={String(stats.postes.vacant)} sub="À pourvoir" tone="amber" />
            <StatCard icon={Users} label="Occupés" value={String(stats.postes.occupied)} sub="Postes pourvus" tone="emerald" />
            <StatCard icon={UserPlus} label="Non affectés" value={String(stats.postes.unassignedEmployees)} sub="Agents sans poste" tone="orange" />
            <StatCard icon={UserPlus} label="Candidats" value={String(stats.candidates)} sub="Pipeline" tone="cyan" />
            <StatCard icon={Users} label="Période essai" value={String(stats.onTrial)} sub="En essai" tone="violet" />
            <StatCard icon={TrendingUp} label="Taux occupation" value={`${stats.postes.total ? Math.round((stats.postes.occupied / stats.postes.total) * 100) : 0}%`} sub="Postes pourvus" tone="indigo" />
            <StatCard icon={Briefcase} label="Archivés" value={String(stats.postes.archived)} sub="Hors organigramme" tone="slate" />
          </DashboardMetricsRow>
          <GridCards cols={2} className="lg:grid-cols-2">
            <ChartCard title="Postes par département" subtitle="Total, vacants, occupés">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.postes.byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="department" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vacant" name="Vacants" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="occupied" name="Occupés" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Taux d'occupation" subtitle="Par département (%)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={stats.postes.byDepartment.map((d) => ({
                    department: d.department,
                    rate: d.total ? Math.round((d.occupied / d.total) * 100) : 0,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="department" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="rate" name="Taux %" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Pipeline recrutement" subtitle="Étapes candidature → actif">
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
            <ChartCard title="Vacants vs affectés" subtitle="Vue globale postes">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { label: "Vacants", count: stats.postes.vacant },
                      { label: "Occupés", count: stats.postes.occupied },
                      { label: "Archivés", count: stats.postes.archived },
                    ].filter((d) => d.count > 0)}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {[0, 1, 2].map((i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Entrées / sorties" subtitle={`Mouvements ${stats.year}`}>
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
            <ChartCard title="Top postes vacants" subtitle="Codes postes disponibles">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={stats.postes.topVacant.map((p) => ({
                    title: p.code || p.title.slice(0, 20),
                    count: 1,
                  }))}
                  layout="vertical"
                  margin={{ left: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="title" type="category" width={100} stroke={chartUi.axis} fontSize={10} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="count" name="Vacant" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridCards>
        </>
      )}

      {activeTab === "formations" && (
        <>
          <DashboardMetricsRow>
            <StatCard icon={GraduationCap} label="Formations" value={String(stats.formations.total)} sub={`${stats.formations.totalParticipants} participants`} tone="indigo" />
            <StatCard icon={Calendar} label="À venir" value={String(stats.formations.aVenir)} sub="Sessions planifiées" tone="cyan" />
            <StatCard icon={Clock} label="En cours" value={String(stats.formations.enCours)} sub="Sessions actives" tone="amber" />
            <StatCard icon={FileCheck} label="Terminées" value={String(stats.formations.terminees)} sub="Sessions closes" tone="emerald" />
            <StatCard icon={Target} label="Perf. moyenne" value={stats.avgPerformance.toFixed(1)} sub="/5 évaluations" tone="violet" />
            <StatCard icon={AlertTriangle} label="Avertissements" value={String(stats.discipline.totalWarnings)} sub={`${stats.discipline.activeCases} dossiers ouverts`} tone="orange" />
            <StatCard icon={Shield} label="Workflow" value={`${Math.round(stats.workflowCompletionRate)}%`} sub="Onboarding complété" tone="sky" />
            <StatCard icon={Users} label="Période essai" value={String(stats.onTrial)} sub="Agents en essai" tone="rose" />
          </DashboardMetricsRow>
          <GridCards cols={2} className="lg:grid-cols-2">
            <ChartCard title="Formations par mois" subtitle={`${stats.year}`}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.formations.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="month" stroke={chartUi.axis} fontSize={11} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                  <Line type="monotone" dataKey="aVenir" name="À venir" stroke="#38bdf8" strokeWidth={2} />
                  <Line type="monotone" dataKey="enCours" name="En cours" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="terminees" name="Terminées" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Statut formations" subtitle="Répartition globale">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { label: "À venir", count: stats.formations.aVenir },
                      { label: "En cours", count: stats.formations.enCours },
                      { label: "Terminées", count: stats.formations.terminees },
                    ].filter((d) => d.count > 0)}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {[0, 1, 2].map((i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Distribution performance" subtitle="Score /5">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.performanceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="score" stroke={chartUi.axis} fontSize={11} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Discipline par gravité" subtitle="Incidents enregistrés">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.discipline.bySeverity}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="severity" stroke={chartUi.axis} fontSize={11} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="count" name="Incidents" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Workflow onboarding" subtitle="Taux de complétion par étape">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.workflowSteps.slice(0, 10)} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis type="number" domain={[0, 100]} stroke={chartUi.axis} fontSize={11} />
                  <YAxis dataKey="label" type="category" width={120} stroke={chartUi.axis} fontSize={10} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="rate" name="Complétion %" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Formations à venir" subtitle="Prochaines sessions">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={stats.formations.upcoming.slice(0, 6).map((f) => ({
                    title: f.titre.slice(0, 18),
                    participants: f.participantCount,
                  }))}
                  layout="vertical"
                  margin={{ left: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis type="number" stroke={chartUi.axis} fontSize={11} />
                  <YAxis dataKey="title" type="category" width={110} stroke={chartUi.axis} fontSize={10} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="participants" name="Participants" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridCards>
        </>
      )}

      {activeTab === "conformite" && (
        <>
          <DashboardMetricsRow>
            <StatCard icon={FileCheck} label="Conformité docs" value={`${stats.conformite.documentComplianceRate}%`} sub={`${stats.conformite.missingDocsTotal} manquants`} tone="emerald" />
            <StatCard icon={Users} label="Dossiers incomplets" value={String(stats.conformite.incompleteDossiers)} sub={`${stats.conformite.totalActive} actifs`} tone="amber" />
            <StatCard icon={Shield} label="CNSS" value={formatSalary(stats.conformite.cnssMasseCotisable)} sub="Masse cotisable" tone="indigo" />
            <StatCard icon={DollarSign} label="Cotisations" value={formatSalary(stats.conformite.cnssTotalCotisations)} sub="Total mensuel" tone="violet" />
            <StatCard icon={AlertTriangle} label="Sans CNSS" value={String(stats.conformite.sansNumeroCnss)} sub="Numéros manquants" tone="orange" />
            <StatCard icon={AlertTriangle} label="Sans ONEM" value={String(stats.conformite.sansNumeroOnem)} sub="Numéros manquants" tone="rose" />
            <StatCard icon={Clock} label="Pointage" value={`${stats.pointage.saisieRate}%`} sub={`${stats.pointage.feuillesSaisies}/${stats.pointage.totalActifs} saisis`} tone="cyan" />
            <StatCard icon={Target} label="Workflow" value={`${Math.round(stats.workflowCompletionRate)}%`} sub="Étapes complétées" tone="sky" />
          </DashboardMetricsRow>
          <GridCards cols={2} className="lg:grid-cols-2">
            <ChartCard title="Documents manquants" subtitle="Top pièces non reçues">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.conformite.topMissingDocs} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis type="number" stroke={chartUi.axis} fontSize={11} />
                  <YAxis dataKey="label" type="category" width={130} stroke={chartUi.axis} fontSize={10} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Champs dossier manquants" subtitle="Données administratives">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.conformite.fieldGaps.filter((g) => g.count > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="label" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Complétude dossiers" subtitle="Distribution par tranche">
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
            <ChartCard title="Workflow global" subtitle={`${Math.round(stats.workflowCompletionRate)}% complété`}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.workflowSteps}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="label" stroke={chartUi.axis} fontSize={9} angle={-25} textAnchor="end" height={60} />
                  <YAxis stroke={chartUi.axis} fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="rate" name="Taux %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Cotisations CNSS" subtitle="Masse et total mensuel">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={[
                    { label: "Masse cotisable", value: stats.conformite.cnssMasseCotisable },
                    { label: "Total cotisations", value: stats.conformite.cnssTotalCotisations },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="label" stroke={chartUi.axis} fontSize={11} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Pointage — retards" subtitle={`${stats.pointage.moisAnnee} par département`}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.pointage.byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="department" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="retards" name="Retards" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Pointage — absences" subtitle="Non justifiées par département">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.pointage.byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="department" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="absences" name="Absences" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Pointage — heures sup." subtitle="Par département">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.pointage.byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="department" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="heuresSup" name="Heures sup." fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Synthèse pointage" subtitle="Indicateurs du mois">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={[
                    { label: "Retards", count: stats.pointage.totalRetards },
                    { label: "Absences NJ", count: stats.pointage.totalAbsencesNonJustifiees },
                    { label: "Heures sup.", count: stats.pointage.totalHeuresSup },
                    { label: "Jours présents moy.", count: stats.pointage.avgJoursPresents },
                    { label: "Verrouillées", count: stats.pointage.feuillesVerrouillees },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />
                  <XAxis dataKey="label" stroke={chartUi.axis} fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke={chartUi.axis} fontSize={11} />
                  <Tooltip contentStyle={chartUi.tooltip} />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridCards>
        </>
      )}
      </div>
    </div>
  );
}

function AlertsPanel({
  stats,
  canHref,
}: {
  stats: GlobalDashboardStats;
  canHref: (href: string) => boolean;
}) {
  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="font-semibold text-[var(--shell-text)]">Alertes ({stats.alerts.length})</h2>
        </div>
      </CardHeader>
      <CardContent className="pt-0 max-h-48 overflow-y-auto space-y-2">
        {stats.alerts.map((a) => (
          <div key={a.id} className="flex justify-between rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2 text-sm">
            <span className="text-[var(--shell-text-muted)]">{a.employeeName} — {a.message}</span>
            {a.employeeId && canHref("/employes") ? (
              <Link href={employeeDossierHref(a.employeeId, { tab: "conges" })} className="text-sky-400 shrink-0 ml-2">
                Voir
              </Link>
            ) : a.id.startsWith("conge-") && canHref("/conges/gestion") ? (
              <Link href="/conges/gestion" className="text-sky-400 shrink-0 ml-2">
                Gestion
              </Link>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function QuickLinks() {
  return (
    <Grid8 className="!grid-cols-1 sm:!grid-cols-3 lg:!grid-cols-3 xl:!grid-cols-3 gap-4 mt-2">
      <PermissionGate section="employes.documents">
        <QuickLink href="/employes/checking-documents" icon={FileCheck} title="Checking document" desc="Complétude des dossiers par employé" />
      </PermissionGate>
      <PermissionGate section="employes.nouveau">
        <QuickLink href="/employes/nouveau" icon={Briefcase} title="Nouvel employé" desc="Dossier + pièces jointes" />
      </PermissionGate>
      <PermissionGate section="juridique">
        <QuickLink href="/juridique" title="Guide RH RDC" desc="Manuel, Code, cas pratiques" icon={AlertTriangle} />
      </PermissionGate>
      <PermissionGate section="configuration">
        <QuickLink href="/parametres" title="Configuration" desc="Taux & départements" icon={Target} />
      </PermissionGate>
    </Grid8>
  );
}

const chartUiDark = {
  grid: "#334155",
  axis: "#94a3b8",
  tooltip: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
  },
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

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone: MetricTone;
}) {
  return (
    <MetricCard
      compact
      tone={tone}
      icon={icon}
      label={label}
      hint={sub}
      value={value}
      className="min-w-[7.25rem] flex-1 shrink-0"
    />
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 hover:border-sky-500/30"
    >
      <Icon className="h-6 w-6 text-sky-400" />
      <div>
        <p className="font-semibold text-[var(--shell-text)]">{title}</p>
        <p className="text-sm text-[var(--shell-text-muted)]">{desc}</p>
      </div>
      <ArrowRight className="ml-auto h-5 w-5 text-[var(--shell-text-muted)] group-hover:text-sky-400" />
    </Link>
  );
}
