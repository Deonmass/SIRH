"use client";

import { useEffect, useMemo, useState } from "react";
import { Gauge, Loader2, Wrench, X } from "lucide-react";
import type { Vehicule } from "@/lib/repositories/vehicules";
import type { EntretienHistoriqueEntry, EntretienSuiviRow } from "@/lib/charroi-entretien";
import { formatKm } from "@/lib/charroi-entretien";
import { ProchainEntretienKmCell } from "@/components/charroi/CharroiEntretienUi";
import { formatDateTimeFr } from "@/lib/charroi-relative-time";
import type { VehiculePanneEvent } from "@/lib/vehicule-pannes";
import { cn, formatDate } from "@/lib/utils";

type TabId = "infos" | "pannes" | "entretien";

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-500">{title}</h4>
      <dl className="mt-3 space-y-2.5">{children}</dl>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-xs text-[var(--shell-text-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--shell-text)]">{value}</dd>
    </div>
  );
}

function PanneEventBadge({ type }: { type: VehiculePanneEvent["type"] }) {
  const isPanne = type === "panne";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
        isPanne
          ? "bg-red-500/15 text-red-500"
          : "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400"
      )}
    >
      {isPanne ? "Panne" : "Remise en service"}
    </span>
  );
}

function HistoriquePannes({ events }: { events: VehiculePanneEvent[] }) {
  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
      ),
    [events]
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-[var(--shell-text-muted)]">Aucune panne enregistrée.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((event, idx) => (
        <li
          key={`${event.at}-${idx}`}
          className="rounded-lg border border-[var(--shell-border)] px-3 py-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PanneEventBadge type={event.type} />
            <span className="text-[10px] text-[var(--shell-text-muted)]">
              {formatDateTimeFr(event.at)}
            </span>
          </div>
          <p className="mt-1.5 text-sm">{event.description}</p>
        </li>
      ))}
    </ul>
  );
}

function HistoriqueEntretiens({ items }: { items: EntretienHistoriqueEntry[] }) {
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [items]
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-[var(--shell-text-muted)]">Aucun entretien enregistré.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((entry) => (
        <li
          key={entry.id}
          className="rounded-lg border border-[var(--shell-border)] px-3 py-2.5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="font-medium text-sm">{entry.type}</div>
            <span className="text-[10px] text-[var(--shell-text-muted)]">
              {formatDate(entry.date)}
            </span>
          </div>
          {entry.types && entry.types.length > 1 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {entry.types.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-600 dark:text-sky-400"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--shell-text-muted)]">
            {entry.kmOdometre != null && (
              <span className="tabular-nums">{formatKm(entry.kmOdometre)}</span>
            )}
            {entry.cout != null && (
              <span className="tabular-nums">{entry.cout.toLocaleString("fr-FR")} $</span>
            )}
            {entry.prestataire && <span>{entry.prestataire}</span>}
          </div>
          {entry.notes && (
            <p className="mt-1.5 text-xs text-[var(--shell-text-muted)]">{entry.notes}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function VehiculeDetailModal({
  vehicule,
  onClose,
}: {
  vehicule: Vehicule;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabId>("infos");
  const [entretienSuivi, setEntretienSuivi] = useState<EntretienSuiviRow | null>(null);
  const [historiqueLoading, setHistoriqueLoading] = useState(false);

  const entretienHistorique = entretienSuivi?.historique ?? vehicule.entretien?.historique ?? [];

  useEffect(() => {
    if (tab !== "entretien") return;

    let cancelled = false;
    async function loadEntretien() {
      setHistoriqueLoading(true);
      try {
        const res = await fetch("/api/charroi/entretien");
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const row = (data.items as EntretienSuiviRow[] | undefined)?.find(
          (item) => item.vehiculeId === vehicule.id
        );
        if (row && !cancelled) setEntretienSuivi(row);
      } catch {
        if (!cancelled) setEntretienSuivi(null);
      } finally {
        if (!cancelled) setHistoriqueLoading(false);
      }
    }

    void loadEntretien();
    return () => {
      cancelled = true;
    };
  }, [tab, vehicule.id]);

  const tabs = [
    { id: "infos" as const, label: "Informations" },
    {
      id: "pannes" as const,
      label: `Pannes${vehicule.pannes.length > 0 ? ` (${vehicule.pannes.length})` : ""}`,
    },
    {
      id: "entretien" as const,
      label: `Entretien${entretienHistorique.length > 0 ? ` (${entretienHistorique.length})` : ""}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl flex flex-col">
        <div className="shrink-0 border-b border-[var(--shell-border)] bg-[var(--shell-bg)] px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Fiche véhicule</h3>
              <p className="mt-0.5 text-sm text-[var(--shell-text-muted)]">
                {vehicule.plaque ?? `Véhicule n° ${vehicule.id}`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-b border-[var(--shell-border)]">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium transition -mb-px",
                  tab === t.id
                    ? "border-sky-500 text-sky-600 dark:text-sky-400"
                    : "border-transparent text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {tab === "infos" ? (
            <div className="space-y-4">
              <DetailSection title="Identification">
                <DetailRow label="Marque" value={vehicule.marque} />
                <DetailRow label="Type" value={vehicule.vehicleType ?? "—"} />
                <DetailRow label="Plaque" value={vehicule.plaque ?? "—"} />
                <DetailRow
                  label="N° châssis"
                  value={
                    vehicule.numeroChassis ? (
                      <span className="font-mono">{vehicule.numeroChassis}</span>
                    ) : (
                      "—"
                    )
                  }
                />
                <DetailRow
                  label="Km initial"
                  value={
                    vehicule.kilometrageInitiale != null
                      ? formatKm(vehicule.kilometrageInitiale)
                      : "—"
                  }
                />
              </DetailSection>

              <DetailSection title="Immatriculation & puissance">
                <DetailRow label="Province" value={vehicule.province ?? "—"} />
                <DetailRow
                  label="Mise en circulation"
                  value={
                    vehicule.miseCirculation
                      ? (vehicule.miseCirculation.match(/^(\d{4})/)?.[1] ??
                        formatDate(vehicule.miseCirculation))
                      : "—"
                  }
                />
                <DetailRow
                  label="Puissance (CV)"
                  value={vehicule.cv != null ? String(vehicule.cv) : "—"}
                />
              </DetailSection>

              <DetailSection title="Affectation">
                <DetailRow label="Centre de coût" value={vehicule.centreDeCout ?? "—"} />
              </DetailSection>

              <DetailSection title="Traçabilité">
                <DetailRow
                  label="Créé le"
                  value={vehicule.createdAt ? formatDate(vehicule.createdAt) : "—"}
                />
                <DetailRow
                  label="Modifié le"
                  value={vehicule.updatedAt ? formatDate(vehicule.updatedAt) : "—"}
                />
              </DetailSection>
            </div>
          ) : tab === "pannes" ? (
            <section>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-400">
                <Wrench className="h-4 w-4" />
                Pannes & remises en service
              </h4>
              <HistoriquePannes events={vehicule.pannes} />
            </section>
          ) : historiqueLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
            </div>
          ) : (
            <section>
              {entretienSuivi?.prochainEntretienKm != null && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
                  <div>
                    <p className="text-xs text-[var(--shell-text-muted)]">Kilométrage actuel</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatKm(entretienSuivi.kmActuel)}
                    </p>
                  </div>
                  <ProchainEntretienKmCell
                    prochainKm={entretienSuivi.prochainEntretienKm}
                    kmRestant={entretienSuivi.kmRestantEntretien}
                    alertLevel={entretienSuivi.alertLevel}
                    size="lg"
                  />
                </div>
              )}
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-500">
                <Gauge className="h-4 w-4" />
                Historique des entretiens
              </h4>
              <HistoriqueEntretiens items={entretienHistorique} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
