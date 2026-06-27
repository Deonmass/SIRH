"use client";

import { useMemo, useState } from "react";
import { Loader2, Route, Sparkles, X } from "lucide-react";
import type { CharroiVehicule } from "@/lib/repositories/charroi";
import type { CourseVehicule } from "@/lib/repositories/courses-vehicule";
import {
  computeAffectationProposals,
  formatCourseTrajet,
  type AffectationProposal,
} from "@/lib/charroi-affectation-intelligente";
import { isDemandeExpiree } from "@/lib/charroi-relative-time";
import { employeeDisplayName } from "@/lib/extra-costs";
import type { Employee } from "@/lib/types";
import { readApiError, showErrorAlert } from "@/lib/alerts";
import { cn } from "@/lib/utils";

export function CharroiAffectationIntelligenteModal({
  demandes,
  chauffeurs,
  vehiculesDisponibles,
  employeeByMatricule,
  onClose,
  onApplied,
}: {
  demandes: CourseVehicule[];
  chauffeurs: Employee[];
  vehiculesDisponibles: CharroiVehicule[];
  employeeByMatricule: Map<string, Employee>;
  onClose: () => void;
  onApplied: (updated: CourseVehicule[]) => void;
}) {
  const demandesActives = useMemo(
    () => demandes.filter((d) => !isDemandeExpiree(d.dateDemande)),
    [demandes]
  );

  const proposals = useMemo(
    () => computeAffectationProposals(demandesActives, chauffeurs, vehiculesDisponibles),
    [demandesActives, chauffeurs, vehiculesDisponibles]
  );

  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const pending = proposals.filter((p) => !appliedIds.has(p.id));

  async function applyProposal(proposal: AffectationProposal): Promise<CourseVehicule[]> {
    const updated: CourseVehicule[] = [];
    for (const course of proposal.courses) {
      const res = await fetch("/api/charroi/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          id: course.id,
          vehiculeId: proposal.vehiculeId,
          chauffeur: proposal.chauffeurLabel,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      updated.push((await res.json()) as CourseVehicule);
    }
    return updated;
  }

  async function handleApplyOne(proposal: AffectationProposal) {
    setApplyingId(proposal.id);
    try {
      const updated = await applyProposal(proposal);
      setAppliedIds((prev) => new Set(prev).add(proposal.id));
      onApplied(updated);
    } catch (e) {
      await showErrorAlert(
        "Affectation impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setApplyingId(null);
    }
  }

  async function handleApplyAll() {
    setApplyingAll(true);
    try {
      const allUpdated: CourseVehicule[] = [];
      for (const proposal of pending) {
        const updated = await applyProposal(proposal);
        allUpdated.push(...updated);
        setAppliedIds((prev) => new Set(prev).add(proposal.id));
      }
      if (allUpdated.length) onApplied(allUpdated);
      if (pending.length === 0) onClose();
    } catch (e) {
      await showErrorAlert(
        "Affectation impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setApplyingAll(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[var(--shell-border)] px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-violet-500/15 p-2 text-violet-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Affectation intelligente</h3>
                <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">
                  {demandesActives.length} demande(s) à venir
                  {demandes.length > demandesActives.length
                    ? ` (${demandes.length - demandesActives.length} expirée(s) ignorée(s))`
                    : ""}{" "}
                  · {chauffeurs.length} chauffeur(s) · {vehiculesDisponibles.length} véhicule(s) dispo
                </p>
              </div>
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {proposals.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--shell-text-muted)]">
              {!demandesActives.length
                ? demandes.length
                  ? "Aucune demande à venir (les demandes passées sont exclues)."
                  : "Aucune demande en attente."
                : !chauffeurs.length
                  ? "Aucun chauffeur disponible."
                  : !vehiculesDisponibles.length
                    ? "Aucun véhicule disponible."
                    : "Aucune proposition générée."}
            </p>
          ) : (
            <ul className="space-y-3">
              {proposals.map((proposal) => {
                const done = appliedIds.has(proposal.id);
                const isMulti = proposal.courses.length > 1;
                return (
                  <li
                    key={proposal.id}
                    className={cn(
                      "rounded-xl border p-4",
                      done
                        ? "border-emerald-500/30 bg-emerald-500/5 opacity-60"
                        : isMulti
                          ? "border-violet-500/30 bg-violet-500/5"
                          : "border-[var(--shell-border)] bg-[var(--shell-surface)]/40"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{proposal.chauffeurLabel}</span>
                          <span className="font-mono text-xs text-[var(--shell-text-muted)]">
                            {proposal.vehiculeLabel}
                          </span>
                          {isMulti && (
                            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                              {proposal.courses.length} courses
                            </span>
                          )}
                          {done && (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400">
                              Affecté
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-sky-400/90">
                          <Route className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {proposal.rationale}
                        </p>
                      </div>
                      {!done && (
                        <button
                          type="button"
                          disabled={applyingId != null || applyingAll}
                          onClick={() => void handleApplyOne(proposal)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                        >
                          {applyingId === proposal.id && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          )}
                          Affecter
                        </button>
                      )}
                    </div>
                    <ol className="mt-3 space-y-1.5 border-t border-[var(--shell-border)] pt-3">
                      {proposal.courses.map((course, idx) => {
                        const emp = employeeByMatricule.get(course.matriculeAgent);
                        return (
                          <li
                            key={course.id}
                            className="flex items-start gap-2 text-xs"
                          >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--shell-border)] text-[10px] font-medium">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-medium text-[var(--shell-text)]">
                                {formatCourseTrajet(course)}
                              </div>
                              <div className="text-[10px] text-[var(--shell-text-muted)]">
                                {emp
                                  ? employeeDisplayName(emp)
                                  : course.matriculeAgent}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {pending.length > 1 && (
          <div className="shrink-0 border-t border-[var(--shell-border)] px-6 py-4">
            <button
              type="button"
              disabled={applyingId != null || applyingAll}
              onClick={() => void handleApplyAll()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {applyingAll && <Loader2 className="h-4 w-4 animate-spin" />}
              Affecter toutes les propositions ({pending.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
