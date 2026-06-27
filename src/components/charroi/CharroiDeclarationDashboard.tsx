"use client";

import type { DeclarationDashboardStats } from "@/lib/charroi-vehicule-declaration";
import { KM_DECLASSEMENT_SEUIL, STATUT_TECHNIQUE_OPTIONS } from "@/lib/charroi-vehicule-declaration";
import { cn } from "@/lib/utils";

function StatutPill({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "emerald" | "amber" | "rose" | "slate";
}) {
  const tones = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    slate: "border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--shell-text-muted)]",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-center", tones[tone])}>
      <div className="text-2xl font-bold tabular-nums">{count}</div>
      <div className="mt-1 text-xs font-medium">{label}</div>
    </div>
  );
}

function MatrixTable({
  title,
  subtitle,
  rows,
  columns,
}: {
  title: string;
  subtitle?: string;
  columns: { key: string; label: string; className?: string }[];
  rows: Record<string, string | number>[];
}) {
  return (
    <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] overflow-hidden">
      <div className="border-b border-[var(--shell-border)] bg-[var(--shell-bg)]/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--shell-text)]">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">{subtitle}</p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
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
            {rows.map((row) => (
              <tr key={String(row.label)} className="border-t border-[var(--shell-border)]/60">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-2 tabular-nums",
                      col.key === "label" ? "font-medium text-[var(--shell-text)]" : "",
                      col.className
                    )}
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CharroiDeclarationDashboard({
  data,
}: {
  data: DeclarationDashboardStats;
}) {
  const statutMap = Object.fromEntries(data.parStatut.map((r) => [r.label, r.count]));
  const bon = statutMap["Bon état"] ?? 0;
  const avert = statutMap["Avertissement"] ?? 0;
  const declass = statutMap["A déclasser"] ?? 0;

  return (
    <section className="mb-8 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-[var(--shell-text-muted)]">
          Déclaration parc — résumé des états
        </h2>
        <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
          {data.total} véhicule{data.total !== 1 ? "s" : ""} · aligné sur la déclaration PPC / LOXEA
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatutPill label="Bon état" count={bon} tone="emerald" />
        <StatutPill label="Avertissement" count={avert} tone="amber" />
        <StatutPill label="A déclasser" count={declass} tone="rose" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MatrixTable
          title="Critère par année de circulation"
          subtitle="Tranches d'âge vs observation technique enregistrée"
          columns={[
            { key: "label", label: "Tranche" },
            { key: "bonEtat", label: "Bon état", className: "text-emerald-400" },
            { key: "avertissement", label: "Avertissement", className: "text-amber-400" },
            { key: "aDeclasser", label: "A déclasser", className: "text-rose-400" },
            { key: "total", label: "Total" },
          ]}
          rows={data.critereAge.map((r) => ({
            label: r.label,
            bonEtat: r.bonEtat,
            avertissement: r.avertissement,
            aDeclasser: r.aDeclasser,
            total: r.total,
          }))}
        />

        <MatrixTable
          title="Critère par kilométrage"
          subtitle={`Seuil de référence : ${KM_DECLASSEMENT_SEUIL.toLocaleString("fr-FR")} km`}
          columns={[
            { key: "label", label: "Tranche km" },
            { key: "bonEtat", label: "Bon état", className: "text-emerald-400" },
            { key: "avertissement", label: "Avert.", className: "text-amber-400" },
            { key: "aDeclasser", label: "A déclasser", className: "text-rose-400" },
            { key: "total", label: "Total" },
          ]}
          rows={data.critereKm.map((r) => ({
            label: r.label,
            bonEtat: r.bonEtat,
            avertissement: r.avertissement,
            aDeclasser: r.aDeclasser,
            total: r.total,
          }))}
        />
      </div>

      {data.parSociete.length > 0 && (
        <MatrixTable
          title="Répartition par société propriétaire"
          subtitle="PPC, LOXEA et autres entités"
          columns={[
            { key: "societe", label: "Société" },
            { key: "bonEtat", label: "Bon état", className: "text-emerald-400" },
            { key: "avertissement", label: "Avertissement", className: "text-amber-400" },
            { key: "aDeclasser", label: "A déclasser", className: "text-rose-400" },
            { key: "total", label: "Total" },
          ]}
          rows={data.parSociete.map((r) => ({
            societe: r.societe,
            bonEtat: r.bonEtat,
            avertissement: r.avertissement,
            aDeclasser: r.aDeclasser,
            total: r.total,
          }))}
        />
      )}

      <p className="text-xs text-[var(--shell-text-muted)]">
        Observations techniques attendues : {STATUT_TECHNIQUE_OPTIONS.join(" · ")}.
      </p>
    </section>
  );
}
