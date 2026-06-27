"use client";

import { SlidersHorizontal, X } from "lucide-react";
import type {
  SanteAdvancedPeriodMode,
  SanteFileAttenteAdvancedFilters,
} from "@/lib/sante-file-attente-filters";
import { cn } from "@/lib/utils";

const MODES: { id: SanteAdvancedPeriodMode; label: string }[] = [
  { id: "interval", label: "Intervalle de dates" },
  { id: "week", label: "Semaine" },
  { id: "quarter", label: "Trimestre" },
  { id: "semester", label: "Semestre" },
];

export function SanteFileAttenteAdvancedSearch({
  open,
  filters,
  onChange,
  onClose,
  onApply,
  onReset,
}: {
  open: boolean;
  filters: SanteFileAttenteAdvancedFilters;
  onChange: (patch: Partial<SanteFileAttenteAdvancedFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Recherche avancée</h3>
            <p className="mt-1 text-sm text-[var(--shell-text-muted)]">
              Filtrez par période personnalisée, semaine, trimestre ou semestre.
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

        <div className="mt-4 flex flex-wrap gap-2">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChange({ mode: mode.id })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                filters.mode === mode.id
                  ? "border-sky-500 bg-sky-500/15 text-sky-400"
                  : "border-[var(--shell-border)] text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          {filters.mode === "interval" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Du</span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onChange({ dateFrom: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Au</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onChange({ dateTo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
            </div>
          )}

          {filters.mode === "week" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Année</span>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={filters.weekYear}
                  onChange={(e) => onChange({ weekYear: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Semaine n°</span>
                <input
                  type="number"
                  min={1}
                  max={53}
                  value={filters.week}
                  onChange={(e) => onChange({ week: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
            </div>
          )}

          {filters.mode === "quarter" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Année</span>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={filters.quarterYear}
                  onChange={(e) => onChange({ quarterYear: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Trimestre</span>
                <select
                  value={filters.quarter}
                  onChange={(e) =>
                    onChange({ quarter: Number(e.target.value) as 1 | 2 | 3 | 4 })
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                >
                  <option value={1}>T1 — Jan à Mar</option>
                  <option value={2}>T2 — Avr à Jun</option>
                  <option value={3}>T3 — Jul à Sep</option>
                  <option value={4}>T4 — Oct à Déc</option>
                </select>
              </label>
            </div>
          )}

          {filters.mode === "semester" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Année</span>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={filters.semesterYear}
                  onChange={(e) => onChange({ semesterYear: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Semestre</span>
                <select
                  value={filters.semester}
                  onChange={(e) => onChange({ semester: Number(e.target.value) as 1 | 2 })}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                >
                  <option value={1}>S1 — Jan à Jun</option>
                  <option value={2}>S2 — Jul à Déc</option>
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm hover:bg-[var(--shell-hover)]"
          >
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}
