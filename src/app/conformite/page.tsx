import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  FileCheck,
  FileX,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import { DashboardMetricsRow, MetricCard } from "@/components/dashboard/DashboardMetricsRow";
import { SectionQuickLinks } from "@/components/dashboard/SectionQuickLinks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { buildConformiteDashboard } from "@/lib/conformite-dashboard";
import { getDatabase } from "@/lib/store";

export default async function ConformiteDashboardPage() {
  const db = await getDatabase();
  const stats = buildConformiteDashboard(db);
  const hideSalaries = db.settings.hideSalariesFromDisplay === true;

  return (
    <>
      <PageHeader
        title="Conformité docs — Dashboard"
        description="Documents, CNSS, ONEM, INPP et contrôles réglementaires"
      />

      <DashboardMetricsRow className="mb-8">
        <MetricCard
          tone="emerald"
          icon={FileCheck}
          label="Conformité documents"
          value={`${stats.documentComplianceRate}%`}
        />
        <MetricCard tone="amber" icon={AlertTriangle} label="Dossiers incomplets" value={stats.incompleteDossiers} />
        <MetricCard tone="rose" icon={FileX} label="Pièces manquantes" value={stats.missingDocsTotal} />
        <MetricCard tone="sky" icon={Users} label="Agents actifs contrôlés" value={stats.totalActive} />
        <MetricCard tone="orange" icon={Shield} label="Sans n° CNSS" value={stats.sansNumeroCnss} />
        <MetricCard tone="orange" icon={ShieldAlert} label="Sans n° ONEM" value={stats.sansNumeroOnem} />
        {!hideSalaries && (
          <>
            <MetricCard
              tone="cyan"
              icon={Calculator}
              label="Masse cotisable CNSS"
              value={Math.round(stats.cnssMasseCotisable).toLocaleString("fr-FR")}
            />
            <MetricCard
              tone="violet"
              icon={Banknote}
              label="Cotisations CNSS totales"
              value={Math.round(stats.cnssTotalCotisations).toLocaleString("fr-FR")}
            />
          </>
        )}
      </DashboardMetricsRow>

      <SectionQuickLinks
        links={[
          {
            href: "/conformite/checklist",
            title: "Checklist documents",
            description: "Suivi des pièces obligatoires",
            icon: "file-check",
            accent: "text-emerald-400",
          },
          {
            href: "/conformite/cnss",
            title: "CNSS",
            description: "Déclarations sociales",
            icon: "shield",
            accent: "text-blue-400",
          },
          {
            href: "/conformite/cnss/masse-cotisable",
            title: "Masse cotisable",
            description: "Base de cotisation mensuelle",
            icon: "clipboard-list",
            accent: "text-indigo-400",
          },
          {
            href: "/conformite/cnss/checklist-mensuelle",
            title: "Checklist mensuelle",
            description: "Échéances CNSS du mois",
            icon: "file-check",
            accent: "text-cyan-400",
          },
          {
            href: "/conformite/cnss/delais",
            title: "Délais & calendrier",
            description: "Dates limites déclaration",
            icon: "calendar",
            accent: "text-violet-400",
          },
          {
            href: "/conformite/onem",
            title: "ONEM",
            description: "Emploi & déclarations",
            icon: "shield",
            accent: "text-amber-400",
          },
          {
            href: "/conformite/inpp",
            title: "INPP",
            description: "Formation professionnelle",
            icon: "shield",
            accent: "text-rose-400",
          },
          {
            href: "/conformite/autres",
            title: "Autres contrôles",
            description: "Vérifications complémentaires",
            icon: "file-warning",
            accent: "text-orange-400",
          },
        ]}
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <h2 className="text-sm font-semibold text-[var(--shell-text)] mb-3">
              Documents les plus manquants
            </h2>
            {stats.topMissingDocs.length === 0 ? (
              <p className="text-sm text-[var(--shell-text-muted)]">Aucune lacune documentaire.</p>
            ) : (
              <ul className="space-y-2">
                {stats.topMissingDocs.map((d) => (
                  <li
                    key={d.label}
                    className="flex justify-between text-sm border-b border-[var(--shell-border)] pb-2"
                  >
                    <span className="text-[var(--shell-text-muted)]">{d.label}</span>
                    <span className="font-medium text-rose-300">{d.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <h2 className="text-sm font-semibold text-[var(--shell-text)] mb-3">
              Champs réglementaires manquants
            </h2>
            {stats.fieldGaps.length === 0 ? (
              <p className="text-sm text-[var(--shell-text-muted)]">Tous les champs sont renseignés.</p>
            ) : (
              <ul className="space-y-2">
                {stats.fieldGaps.map((g) => (
                  <li
                    key={g.label}
                    className="flex justify-between text-sm border-b border-[var(--shell-border)] pb-2"
                  >
                    <span className="text-[var(--shell-text-muted)]">{g.label}</span>
                    <span className="font-medium text-amber-300">{g.count}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/conformite/checklist"
              className="mt-4 inline-block text-xs text-sky-400 hover:underline"
            >
              Ouvrir la checklist complète →
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
