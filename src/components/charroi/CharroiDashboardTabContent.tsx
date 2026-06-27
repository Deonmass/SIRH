"use client";

import Link from "next/link";
import { AlertTriangle, Route, Wrench } from "lucide-react";
import { DashboardMetricsRow, MetricCard } from "@/components/dashboard/DashboardMetricsRow";
import { formatKm } from "@/lib/charroi-entretien";
import type {
  CharroiDashboardCountRow,
  CharroiDashboardCoursesTab,
  CharroiDashboardEntretiensTab,
  CharroiDashboardPannesTab,
} from "@/lib/charroi-dashboard-detail";
import { cn, formatDate } from "@/lib/utils";

function CountTable({
  title,
  rows,
  emptyLabel = "Aucune donnée sur la période",
}: {
  title: string;
  rows: CharroiDashboardCountRow[];
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] overflow-hidden">
      <div className="border-b border-[var(--shell-border)] bg-[var(--shell-bg)]/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--shell-text)]">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-[var(--shell-text-muted)]">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[240px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-[var(--shell-text-muted)]">
                <th className="px-3 py-2 font-medium">Libellé</th>
                <th className="px-3 py-2 text-right font-medium">Nombre</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-[var(--shell-border)]/60">
                  <td className="px-3 py-2 font-medium text-[var(--shell-text)]">{row.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DataTable({
  title,
  subtitle,
  linkHref,
  linkLabel,
  columns,
  rows,
  emptyLabel = "Aucune entrée sur la période",
}: {
  title: string;
  subtitle?: string;
  linkHref?: string;
  linkLabel?: string;
  columns: { key: string; label: string; className?: string; mono?: boolean }[];
  rows: Record<string, string | number | undefined>[];
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--shell-border)] bg-[var(--shell-bg)]/60 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--shell-text)]">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">{subtitle}</p>
          )}
        </div>
        {linkHref && linkLabel && (
          <Link href={linkHref} className="text-xs font-medium text-sky-500 hover:underline">
            {linkLabel}
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-[var(--shell-text-muted)]">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-[var(--shell-text-muted)]">
                {columns.map((col) => (
                  <th key={col.key} className={cn("px-3 py-2 font-medium", col.className)}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-[var(--shell-border)]/60">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2",
                        col.mono && "font-mono text-xs",
                        col.className
                      )}
                    >
                      {row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CharroiDashboardCoursesTab({
  data,
  kmLabel,
}: {
  data: CharroiDashboardCoursesTab;
  kmLabel: string;
}) {
  return (
    <div className="space-y-6">
      <DashboardMetricsRow>
        <MetricCard tone="indigo" icon={Route} label="Total courses" value={data.total} />
        <MetricCard tone="amber" icon={Route} label="Demandes" value={data.demandes} />
        <MetricCard tone="sky" icon={Route} label="En cours" value={data.enCours + data.affectees} />
        <MetricCard tone="emerald" icon={Route} label="Terminées" value={data.terminees} />
        <MetricCard tone="cyan" icon={Route} label={kmLabel} value={formatKm(data.kmParcours)} />
      </DashboardMetricsRow>

      <div className="grid gap-4 xl:grid-cols-3">
        <CountTable title="Par statut" rows={data.parStatut} />
        <CountTable title="Par type de course" rows={data.parType} />
        <CountTable title="Par chauffeur" rows={data.parChauffeur} />
      </div>

      <DataTable
        title="Détail des courses"
        subtitle={`${data.liste.length} course${data.liste.length !== 1 ? "s" : ""} sur la période`}
        linkHref="/charroi/planning"
        linkLabel="Ouvrir le planning →"
        columns={[
          { key: "date", label: "Date", mono: true },
          { key: "demandeur", label: "Demandeur", mono: true },
          { key: "chauffeur", label: "Chauffeur" },
          { key: "type", label: "Type" },
          { key: "vehicule", label: "Véhicule", mono: true },
          { key: "destination", label: "Destination" },
          { key: "statut", label: "Statut" },
          { key: "kmParcours", label: "Km", className: "text-right tabular-nums" },
        ]}
        rows={data.liste.map((c) => ({
          date: formatDate(c.date),
          demandeur: c.demandeur,
          chauffeur: c.chauffeur,
          type: c.type,
          vehicule: c.vehicule,
          destination: c.destination,
          statut: c.statut,
          kmParcours: c.kmParcours != null ? formatKm(c.kmParcours) : "—",
        }))}
      />
    </div>
  );
}

export function CharroiDashboardEntretiensTab({ data }: { data: CharroiDashboardEntretiensTab }) {
  return (
    <div className="space-y-6">
      <DashboardMetricsRow>
        <MetricCard tone="rose" icon={AlertTriangle} label="En retard" value={data.enRetard} />
        <MetricCard tone="amber" icon={Wrench} label="À planifier" value={data.aPlanifier} />
        <MetricCard tone="emerald" icon={Wrench} label="À jour" value={data.aJour} />
        <MetricCard
          tone="sky"
          icon={Wrench}
          label="Réalisés (période)"
          value={data.historiquePeriode}
        />
      </DashboardMetricsRow>

      <DataTable
        title="Alertes entretien"
        subtitle="Véhicules en retard ou proches du seuil kilométrique"
        linkHref="/charroi/vehicules?tab=entretien"
        linkLabel="Suivi entretien →"
        columns={[
          { key: "immatriculation", label: "Plaque", mono: true },
          { key: "marque", label: "Marque" },
          { key: "type", label: "Type" },
          { key: "alerte", label: "Alerte" },
          { key: "kmActuel", label: "Km actuel", className: "text-right tabular-nums" },
          { key: "prochainKm", label: "Prochain km", className: "text-right tabular-nums" },
          { key: "dernierEntretien", label: "Dernier entretien", mono: true },
        ]}
        rows={data.alertes.map((a) => ({
          immatriculation: a.immatriculation,
          marque: a.marque,
          type: a.type,
          alerte: a.alerte,
          kmActuel: a.kmActuel != null ? formatKm(a.kmActuel) : "—",
          prochainKm: a.prochainKm != null ? formatKm(a.prochainKm) : "—",
          dernierEntretien: a.dernierEntretien ? formatDate(a.dernierEntretien) : "—",
        }))}
        emptyLabel="Aucune alerte entretien"
      />

      <DataTable
        title="Historique entretien (période)"
        subtitle={`${data.historique.length} intervention${data.historique.length !== 1 ? "s" : ""}`}
        columns={[
          { key: "date", label: "Date", mono: true },
          { key: "immatriculation", label: "Plaque", mono: true },
          { key: "types", label: "Types" },
          { key: "km", label: "Km odomètre", className: "text-right tabular-nums" },
          { key: "prestataire", label: "Prestataire" },
          { key: "cout", label: "Coût", className: "text-right tabular-nums" },
        ]}
        rows={data.historique.map((h) => ({
          date: formatDate(h.date),
          immatriculation: h.immatriculation,
          types: h.types,
          km: h.km != null ? formatKm(h.km) : "—",
          prestataire: h.prestataire,
          cout: h.cout != null ? h.cout.toLocaleString("fr-FR") : "—",
        }))}
      />
    </div>
  );
}

export function CharroiDashboardPannesTab({ data }: { data: CharroiDashboardPannesTab }) {
  return (
    <div className="space-y-6">
      <DashboardMetricsRow>
        <MetricCard tone="orange" icon={Wrench} label="En panne (actuel)" value={data.vehiculesEnPanne} />
        <MetricCard tone="rose" icon={AlertTriangle} label="Déclarations" value={data.declarations} />
        <MetricCard tone="emerald" icon={Wrench} label="Remises en service" value={data.remisesService} />
        <MetricCard tone="amber" icon={AlertTriangle} label="Événements période" value={data.eventsPeriode} />
      </DashboardMetricsRow>

      <div className="grid gap-4 xl:grid-cols-2">
        <CountTable title="Déclarations par véhicule" rows={data.parVehicule} />
        <DataTable
          title="Historique pannes / remises"
          subtitle={`${data.liste.length} événement${data.liste.length !== 1 ? "s" : ""}`}
          linkHref="/charroi/vehicules"
          linkLabel="Gérer le parc →"
          columns={[
            { key: "date", label: "Date", mono: true },
            { key: "immatriculation", label: "Plaque", mono: true },
            { key: "marque", label: "Marque" },
            { key: "type", label: "Type" },
            { key: "event", label: "Événement" },
            { key: "description", label: "Description" },
          ]}
          rows={data.liste.map((p) => ({
            date: formatDate(p.date),
            immatriculation: p.immatriculation,
            marque: p.marque,
            type: p.type,
            event: p.enPanne ? "Déclaration panne" : "Remise en service",
            description: p.description,
          }))}
        />
      </div>
    </div>
  );
}
