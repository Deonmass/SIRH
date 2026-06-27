import Link from "next/link";
import {
  Briefcase,
  Building2,
  CircleDashed,
  CircleDollarSign,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { DashboardMetricsRow, MetricCard } from "@/components/dashboard/DashboardMetricsRow";
import { SectionQuickLinks } from "@/components/dashboard/SectionQuickLinks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { buildPostesDashboard } from "@/lib/postes-dashboard";
import { getCentreDesCouts, getDatabase } from "@/lib/store";

function vacantPosteLabel(remaining: number, occupied: number): string {
  if (occupied === 0) {
    return remaining === 1 ? "Entièrement vacant" : `${remaining} places vacantes`;
  }
  return remaining === 1 ? "1 place restante" : `${remaining} places restantes`;
}

export default async function PostesDashboardPage() {
  const [db, centresCouts] = await Promise.all([getDatabase(), getCentreDesCouts()]);
  const stats = buildPostesDashboard(db, centresCouts);

  return (
    <>
      <PageHeader
        title="Postes — Dashboard"
        description="Fiches de poste, vacances et organigramme"
      />

      <DashboardMetricsRow className="mb-8">
        <MetricCard
          tone="sky"
          icon={Briefcase}
          label="Total postes"
          value={stats.totalSlots}
          hint={`${stats.occupied} occupé(s) · ${stats.vacant} vacant(s)`}
        />
        <MetricCard tone="amber" icon={CircleDashed} label="Places vacantes" value={stats.vacant} />
        <MetricCard
          tone="emerald"
          icon={UserCheck}
          label="Postes internes"
          value={stats.interne.totalSlots}
          hint={`${stats.interne.vacant} place(s) vacante(s)`}
        />
        <MetricCard
          tone="violet"
          icon={UserMinus}
          label="Postes externes"
          value={stats.externe.totalSlots}
          hint={`${stats.externe.vacant} place(s) vacante(s)`}
        />
        <MetricCard
          tone="cyan"
          icon={CircleDollarSign}
          label="Centres de coûts"
          value={stats.centreDesCoutsCount}
          hint={`${stats.total} fiche(s) répartie(s)`}
        />
        <MetricCard tone="indigo" icon={Building2} label="Départements couverts" value={stats.departmentCount} />
      </DashboardMetricsRow>

      <SectionQuickLinks
        links={[
          {
            href: "/import?tab=postes",
            title: "Import Excel",
            description: "Charger des fiches de poste depuis un fichier",
            icon: "plus",
            accent: "text-emerald-400",
          },
          {
            href: "/postes/nouvelle-fiche",
            title: "Nouvelle fiche de poste",
            description: "Créer ou modifier une fiche",
            icon: "plus",
            accent: "text-emerald-400",
          },
          {
            href: "/postes/vacants",
            title: "Postes vacants",
            description: "Postes à pourvoir",
            icon: "users",
            accent: "text-amber-400",
          },
          {
            href: "/postes/organigramme",
            title: "Organigramme",
            description: "Hiérarchie des postes",
            icon: "git-branch",
            accent: "text-violet-400",
          },
        ]}
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <h2 className="text-sm font-semibold text-[var(--shell-text)] mb-3">
              Postes par département
            </h2>
            <ul className="space-y-2">
              {stats.byDepartment.map((d) => (
                <li
                  key={d.department}
                  className="flex justify-between gap-4 text-sm border-b border-[var(--shell-border)] pb-2"
                >
                  <span className="text-[var(--shell-text-muted)] truncate">{d.department}</span>
                  <span className="shrink-0 font-medium text-[var(--shell-text)] text-right">
                    {d.occupied}/{d.totalSlots}{" "}
                    <span className="text-amber-400 text-xs">({d.vacant} vac.)</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <h2 className="text-sm font-semibold text-[var(--shell-text)] mb-3">
              Places vacantes
            </h2>
            {stats.topVacant.length === 0 ? (
              <p className="text-sm text-[var(--shell-text-muted)]">Aucune place vacante.</p>
            ) : (
              <ul className="space-y-2">
                {stats.topVacant.map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between gap-4 text-sm border-b border-[var(--shell-border)] pb-2"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/postes/nouvelle-fiche/${p.id}`}
                        className="text-sky-400 hover:underline truncate block"
                      >
                        {p.title}
                      </Link>
                      <p className="text-[10px] text-amber-400 mt-0.5">
                        {vacantPosteLabel(p.remaining, p.occupied)}
                        {p.headcount > 1 ? ` · ${p.occupied}/${p.headcount} occupé(s)` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--shell-text-muted)] font-mono">
                      {p.code}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1 lg:col-span-2 xl:col-auto">
          <CardContent className="pt-4">
            <h2 className="text-sm font-semibold text-[var(--shell-text)] mb-3">
              Postes par centre de coûts
            </h2>
            {stats.byCentreDesCouts.length === 0 ? (
              <p className="text-sm text-[var(--shell-text-muted)]">Aucun poste actif.</p>
            ) : (
              <ul className="space-y-2">
                {stats.byCentreDesCouts.map((row) => (
                  <li
                    key={row.centreId ?? "none"}
                    className="flex justify-between gap-4 text-sm border-b border-[var(--shell-border)] pb-2"
                  >
                    <span className="text-[var(--shell-text-muted)] truncate">{row.label}</span>
                    <span className="shrink-0 font-medium text-[var(--shell-text)] text-right">
                      {row.occupied}/{row.totalSlots}{" "}
                      <span className="text-amber-400 text-xs">({row.vacant} vac.)</span>
                      <span className="block text-[10px] font-normal text-[var(--shell-text-muted)]">
                        {row.totalFiches} fiche(s)
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
