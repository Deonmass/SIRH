"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Wrench,
} from "lucide-react";
import { StickyTable, StickyThead, Td, Th } from "@/components/layout/StickyTable";
import { CharroiEntretienRecordModal } from "@/components/charroi/CharroiEntretienRecordModal";
import {
  ENTRETIEN_TABLE_TD,
  ENTRETIEN_TABLE_TH,
  EntretienAlertBadge,
  ProchainEntretienKmCell,
} from "@/components/charroi/CharroiEntretienUi";
import { VehiculeTypeIcon } from "@/components/charroi/charroi-vehicule-icons";
import {
  formatKm,
  type EntretienAlertLevel,
  type EntretienSuiviRow,
} from "@/lib/charroi-entretien";
import { formatDateTimeFr } from "@/lib/charroi-relative-time";
import {
  defaultEntretienPeriodFilters,
  entretienPeriodLabel,
  filterHistoriqueByPeriod,
  resolveEntretienDateRange,
  rowMatchesEntretienPeriod,
  type EntretienPeriodFilters,
  type EntretienPeriodMode,
} from "@/lib/charroi-entretien-period";
import { MOIS_FR_OPTIONS } from "@/lib/pointage-utils";
import { cn, formatDate } from "@/lib/utils";

const ALERT_ROW_STYLES: Partial<Record<EntretienAlertLevel, string>> = {
  warning: "bg-amber-500/5",
  overdue: "bg-red-500/5",
};

export function CharroiEntretienSuiviTab({ canWrite }: { canWrite: boolean }) {
  const [items, setItems] = useState<EntretienSuiviRow[]>([]);
  const [defaults, setDefaults] = useState({ intervalleKm: 10000, alerteAvantKm: 1000 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAlert, setFilterAlert] = useState<"all" | EntretienAlertLevel>("all");
  const [search, setSearch] = useState("");
  const now = useMemo(() => new Date(), []);
  const [periodFilters, setPeriodFilters] = useState<EntretienPeriodFilters>(() =>
    defaultEntretienPeriodFilters()
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recordTarget, setRecordTarget] = useState<EntretienSuiviRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/charroi/entretien");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chargement impossible");
      setItems(data.items ?? []);
      setDefaults(data.defaults ?? { intervalleKm: 10000, alerteAvantKm: 1000 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const periodRange = useMemo(
    () => resolveEntretienDateRange(periodFilters),
    [periodFilters]
  );

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return Array.from({ length: 8 }, (_, i) => y - i);
  }, [now]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((row) => {
      if (filterAlert !== "all" && row.alertLevel !== filterAlert) return false;
      if (!rowMatchesEntretienPeriod(row, periodRange)) return false;
      if (!q) return true;
      return [row.plaque, row.marque, row.vehicleType, row.alertLabel]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, filterAlert, search, periodRange]);

  const counts = useMemo(
    () => ({
      overdue: filtered.filter((r) => r.alertLevel === "overdue").length,
      warning: filtered.filter((r) => r.alertLevel === "warning").length,
      ok: filtered.filter((r) => r.alertLevel === "ok").length,
    }),
    [filtered]
  );

  function setPeriodMode(mode: EntretienPeriodMode) {
    setPeriodFilters((f) => ({ ...f, mode }));
  }

  function openRecord(row: EntretienSuiviRow) {
    setRecordTarget(row);
  }

  const selectClass =
    "rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2.5 py-2 text-sm";

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-[var(--shell-text-muted)]">Entretien en retard</p>
          <p className="text-2xl font-semibold text-red-500">{counts.overdue}</p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
          <p className="text-xs text-[var(--shell-text-muted)]">À planifier bientôt</p>
          <p className="text-2xl font-semibold text-amber-500">{counts.warning}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
          <p className="text-xs text-[var(--shell-text-muted)]">Dans les seuils</p>
          <p className="text-2xl font-semibold text-emerald-500">{counts.ok}</p>
        </div>
      </div>

      <p className="text-xs text-[var(--shell-text-muted)]">
        Le kilométrage actuel est calculé à partir du dernier compteur enregistré à la clôture des
        courses, ou du kilométrage initial + parcours cumulé. Intervalle par défaut :{" "}
        {formatKm(defaults.intervalleKm)} — alerte {formatKm(defaults.alerteAvantKm)} avant échéance.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[10rem] flex-1 text-sm sm:max-w-xs">
          <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Recherche</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Plaque, marque…"
            className={`w-full ${selectClass}`}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Période</span>
          <select
            value={periodFilters.mode}
            onChange={(e) => setPeriodMode(e.target.value as EntretienPeriodMode)}
            className={`min-w-[8.5rem] ${selectClass}`}
          >
            <option value="all">Toutes</option>
            <option value="year">Année</option>
            <option value="month">Mois</option>
            <option value="quarter">Trimestre</option>
            <option value="semester">Semestre</option>
            <option value="interval">Intervalle</option>
          </select>
        </label>

        {periodFilters.mode !== "all" && periodFilters.mode !== "interval" && (
          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Année</span>
            <select
              value={periodFilters.year}
              onChange={(e) =>
                setPeriodFilters((f) => ({ ...f, year: Number(e.target.value) }))
              }
              className={`min-w-[5.5rem] ${selectClass}`}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        )}

        {periodFilters.mode === "month" && (
          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Mois</span>
            <select
              value={periodFilters.month}
              onChange={(e) =>
                setPeriodFilters((f) => ({
                  ...f,
                  month: e.target.value === "" ? "" : Number(e.target.value),
                }))
              }
              className={`min-w-[7.5rem] ${selectClass}`}
            >
              <option value="">Tous</option>
              {MOIS_FR_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {periodFilters.mode === "quarter" && (
          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Trimestre</span>
            <select
              value={periodFilters.quarter}
              onChange={(e) =>
                setPeriodFilters((f) => ({
                  ...f,
                  quarter: Number(e.target.value) as 1 | 2 | 3 | 4,
                }))
              }
              className={`min-w-[9rem] ${selectClass}`}
            >
              <option value={1}>T1 — Jan à Mar</option>
              <option value={2}>T2 — Avr à Jun</option>
              <option value={3}>T3 — Jul à Sep</option>
              <option value={4}>T4 — Oct à Déc</option>
            </select>
          </label>
        )}

        {periodFilters.mode === "semester" && (
          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Semestre</span>
            <select
              value={periodFilters.semester}
              onChange={(e) =>
                setPeriodFilters((f) => ({
                  ...f,
                  semester: Number(e.target.value) as 1 | 2,
                }))
              }
              className={`min-w-[8.5rem] ${selectClass}`}
            >
              <option value={1}>S1 — Jan à Jun</option>
              <option value={2}>S2 — Jul à Déc</option>
            </select>
          </label>
        )}

        {periodFilters.mode === "interval" && (
          <>
            <label className="text-sm">
              <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Du</span>
              <input
                type="date"
                value={periodFilters.dateFrom}
                onChange={(e) =>
                  setPeriodFilters((f) => ({ ...f, dateFrom: e.target.value }))
                }
                className={selectClass}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Au</span>
              <input
                type="date"
                value={periodFilters.dateTo}
                onChange={(e) =>
                  setPeriodFilters((f) => ({ ...f, dateTo: e.target.value }))
                }
                className={selectClass}
              />
            </label>
          </>
        )}

        <label className="text-sm">
          <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Alerte</span>
          <select
            value={filterAlert}
            onChange={(e) => setFilterAlert(e.target.value as typeof filterAlert)}
            className={selectClass}
          >
            <option value="all">Toutes</option>
            <option value="overdue">En retard</option>
            <option value="warning">À planifier</option>
            <option value="ok">OK</option>
            <option value="unknown">Km inconnu</option>
          </select>
        </label>
      </div>

      {periodFilters.mode !== "all" && (
        <p className="text-[10px] text-[var(--shell-text-muted)]">
          Filtre actif : {entretienPeriodLabel(periodFilters)} — véhicules avec entretien enregistré
          sur la période.
        </p>
      )}

      <StickyTable className="text-xs">
        <StickyThead>
          <tr>
            <Th className={cn("w-7", ENTRETIEN_TABLE_TH)}> </Th>
            <Th className={cn("w-10", ENTRETIEN_TABLE_TH)}> </Th>
            <Th className={ENTRETIEN_TABLE_TH}>Véhicule</Th>
            <Th className={ENTRETIEN_TABLE_TH}>Km init.</Th>
            <Th className={ENTRETIEN_TABLE_TH}>Km actuel</Th>
            <Th className={cn(ENTRETIEN_TABLE_TH, "text-center")}>Courses</Th>
            <Th className={cn(ENTRETIEN_TABLE_TH, "text-center")}>Entret.</Th>
            <Th className={ENTRETIEN_TABLE_TH}>Dernier</Th>
            <Th className={ENTRETIEN_TABLE_TH}>Prochain km</Th>
            <Th className={ENTRETIEN_TABLE_TH}>Statut</Th>
            {canWrite && <Th className={cn("w-24", ENTRETIEN_TABLE_TH)}>Action</Th>}
          </tr>
        </StickyThead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <Td colSpan={canWrite ? 11 : 10} className="py-12 text-center text-[var(--shell-text-muted)]">
                Aucun véhicule pour ces critères.
              </Td>
            </tr>
          ) : (
            filtered.map((row) => {
              const expanded = expandedId === row.vehiculeId;
              return (
                <Fragment key={row.vehiculeId}>
                  <tr
                    className={cn(
                      "cursor-pointer hover:bg-[var(--shell-hover)]",
                      ALERT_ROW_STYLES[row.alertLevel],
                      row.horsService && "opacity-80"
                    )}
                    onClick={() =>
                      setExpandedId((id) => (id === row.vehiculeId ? null : row.vehiculeId))
                    }
                  >
                    <Td className={ENTRETIEN_TABLE_TD}>
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-[var(--shell-text-muted)]" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-[var(--shell-text-muted)]" />
                      )}
                    </Td>
                    <Td className={ENTRETIEN_TABLE_TD}>
                      <VehiculeTypeIcon
                        modele={row.vehicleType}
                        statut={row.horsService ? "maintenance" : "disponible"}
                        size="sm"
                        className="!h-7 !w-7 [&_svg]:!h-3.5 [&_svg]:!w-3.5"
                      />
                    </Td>
                    <Td className={ENTRETIEN_TABLE_TD}>
                      <div className="font-mono text-xs font-semibold">{row.plaque}</div>
                      <div className="text-[10px] leading-tight text-[var(--shell-text-muted)]">
                        {[row.marque, row.vehicleType].filter(Boolean).join(" · ")}
                      </div>
                      {row.horsService && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] text-red-500">
                          <Wrench className="h-2.5 w-2.5" />
                          En panne
                        </span>
                      )}
                    </Td>
                    <Td className={cn(ENTRETIEN_TABLE_TD, "tabular-nums")}>
                      {formatKm(row.kilometrageInitiale)}
                    </Td>
                    <Td className={cn(ENTRETIEN_TABLE_TD, "tabular-nums font-medium")}>
                      {formatKm(row.kmActuel)}
                    </Td>
                    <Td className={cn(ENTRETIEN_TABLE_TD, "tabular-nums text-center")}>
                      {row.nbCourses}
                    </Td>
                    <Td className={cn(ENTRETIEN_TABLE_TD, "tabular-nums text-center")}>
                      {row.nbEntretiens}
                    </Td>
                    <Td className={ENTRETIEN_TABLE_TD}>
                      {row.dernierEntretienDate || row.dernierEntretienKm != null ? (
                        <>
                          <div className="text-xs leading-tight">
                            {row.dernierEntretienDate
                              ? formatDate(row.dernierEntretienDate)
                              : "—"}
                          </div>
                          <div className="text-[10px] text-[var(--shell-text-muted)] tabular-nums">
                            {formatKm(row.dernierEntretienKm)}
                          </div>
                        </>
                      ) : (
                        <span className="text-[var(--shell-text-muted)]">—</span>
                      )}
                    </Td>
                    <Td className={ENTRETIEN_TABLE_TD}>
                      <ProchainEntretienKmCell
                        prochainKm={row.prochainEntretienKm}
                        kmRestant={row.kmRestantEntretien}
                        alertLevel={row.alertLevel}
                        size="sm"
                      />
                    </Td>
                    <Td className={ENTRETIEN_TABLE_TD}>
                      <EntretienAlertBadge level={row.alertLevel} label={row.alertLabel} />
                    </Td>
                    {canWrite && (
                      <Td className={ENTRETIEN_TABLE_TD}>
                        {row.peutPasserEntretien ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRecord(row);
                            }}
                            className="rounded-lg border border-sky-500/30 px-2 py-1 text-[10px] font-medium text-sky-500 hover:bg-sky-500/10"
                          >
                            Passer entretien
                          </button>
                        ) : (
                          <span className="text-[10px] text-[var(--shell-text-muted)]">—</span>
                        )}
                      </Td>
                    )}
                  </tr>
                  {expanded && (
                    <tr key={`${row.vehiculeId}-detail`} className="bg-[var(--shell-surface)]/40">
                      <Td colSpan={canWrite ? 11 : 10} className="px-4 py-3">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div>
                            <h4 className="mb-2 text-xs font-semibold text-[var(--shell-text-muted)]">
                              Kilométrage par course
                            </h4>
                            {row.coursesKm.length === 0 ? (
                              <p className="text-xs text-[var(--shell-text-muted)]">
                                Aucune course avec compteur enregistré.
                              </p>
                            ) : (
                              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                                {row.coursesKm.map((c) => (
                                  <li
                                    key={c.courseId}
                                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-[var(--shell-border)] px-2 py-1.5"
                                  >
                                    <span>{formatDateTimeFr(c.dateDemande)}</span>
                                    <span className="text-[var(--shell-text-muted)]">
                                      {c.kmDepart != null ? formatKm(c.kmDepart) : "—"} →{" "}
                                      {c.kmArrive != null ? formatKm(c.kmArrive) : "—"}
                                      {c.kmParcours != null && (
                                        <span className="ml-1 text-sky-500">
                                          (+{formatKm(c.kmParcours)})
                                        </span>
                                      )}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <h4 className="mb-2 text-xs font-semibold text-[var(--shell-text-muted)]">
                              Historique entretiens
                            </h4>
                            {filterHistoriqueByPeriod(row.historique, periodRange).length === 0 ? (
                              <p className="text-xs text-[var(--shell-text-muted)]">
                                Aucun entretien sur cette période.
                              </p>
                            ) : (
                              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                                {filterHistoriqueByPeriod(row.historique, periodRange).map((h) => (
                                  <li
                                    key={h.id}
                                    className="rounded-lg border border-[var(--shell-border)] px-2 py-1.5"
                                  >
                                    <div className="font-medium">{h.type}</div>
                                    <div className="text-[var(--shell-text-muted)]">
                                      {formatDate(h.date)}
                                      {h.kmOdometre != null && ` · ${formatKm(h.kmOdometre)}`}
                                      {h.cout != null && ` · ${h.cout.toLocaleString("fr-FR")} $`}
                                    </div>
                                    {h.notes && (
                                      <div className="mt-0.5 text-[10px] text-[var(--shell-text-muted)]">
                                        {h.notes}
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </Td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </StickyTable>

      {recordTarget && (
        <CharroiEntretienRecordModal
          target={recordTarget}
          canWrite={canWrite}
          onClose={() => setRecordTarget(null)}
          onSaved={async () => {
            setRecordTarget(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
