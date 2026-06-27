"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Loader2, Search, UserPlus, X } from "lucide-react";
import { MouvementPayrollPreview } from "@/components/mouvements/MouvementPayrollPreview";
import { defaultExtraCosts, employeeDisplayName } from "@/lib/extra-costs";
import { resolveEmployeeExtraCosts } from "@/lib/extra-costs-resolve";
import { readApiError, showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import type { Employee, EmployeeExtraCosts, JobPosition } from "@/lib/types";
import { cn } from "@/lib/utils";

const ASSIGNABLE_STATUSES = [
  "actif",
  "essai",
  "conge",
  "preavis",
  "pre_embauche",
  "candidat",
] as const;

export function AssignEmployeeToPosteModal({
  position,
  employees,
  onClose,
  onAssigned,
  elevated = false,
}: {
  position: JobPosition;
  employees: Employee[];
  onClose: () => void;
  onAssigned: (employee: Employee) => void;
  elevated?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [movementDate, setMovementDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState("");
  const [draftCosts, setDraftCosts] = useState<EmployeeExtraCosts>(() =>
    defaultExtraCosts(position.payroll.currency)
  );
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return employees
      .filter(
        (e) =>
          !e.positionId &&
          (ASSIGNABLE_STATUSES as readonly string[]).includes(e.status)
      )
      .filter((e) => {
        if (!q) return true;
        const haystack =
          `${e.prenom} ${e.nom} ${e.postNom ?? ""} ${e.matricule} ${e.department}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) =>
        `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr")
      );
  }, [employees, filter]);

  const selectedEmployee = selectedId
    ? candidates.find((e) => e.id === selectedId) ??
      employees.find((e) => e.id === selectedId) ??
      null
    : null;

  useEffect(() => {
    if (!selectedEmployee) return;
    setDraftCosts({
      ...resolveEmployeeExtraCosts(selectedEmployee),
      currency: position.payroll.currency,
    });
  }, [selectedEmployee, position.payroll.currency]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployee) return;

    setSaving(true);
    try {
      const res = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          type: "affectation",
          date: movementDate,
          positionId: position.id,
          positionCode: position.code,
          toPosition: position.title,
          toDepartment: position.department,
          toSalary: position.payroll.baseSalary,
          reason: reason.trim() || `Affectation au poste ${position.title}`,
          extraCosts: draftCosts,
          effectiveDate: movementDate,
          legalBasis: "Affectation",
        }),
      });
      if (!res.ok) {
        await showErrorAlert("Affectation impossible", await readApiError(res));
        return;
      }
      const data = (await res.json()) as { employee: Employee };
      await showSuccessAlert(
        "Employé affecté",
        `${employeeDisplayName(data.employee)} est affecté(e) au poste « ${position.title} ».`
      );
      onAssigned(data.employee);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm",
        elevated ? "z-[80]" : "z-[60]"
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(92vh,820px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-popover)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="assign-poste-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--shell-border)] px-5 py-4">
          <div className="min-w-0">
            <h3 id="assign-poste-title" className="font-semibold text-[var(--shell-text)]">
              Affecter un employé
            </h3>
            <p className="mt-0.5 truncate text-sm text-[var(--shell-text-muted)]">
              {position.title} · {position.department}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => void submit(e)}
          className="grid min-h-0 flex-1 lg:grid-cols-[minmax(16rem,22rem)_1fr]"
        >
          <div className="flex min-h-0 flex-col border-b border-[var(--shell-border)] lg:border-b-0 lg:border-r">
            <div className="border-b border-[var(--shell-border)] px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-muted)]" />
                <input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Rechercher par nom ou matricule…"
                  className="w-full rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] py-2.5 pl-9 pr-3 text-sm text-[var(--shell-text)]"
                  autoFocus
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {candidates.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--shell-text-muted)]">
                  {filter.trim()
                    ? "Aucun employé sans poste ne correspond à cette recherche."
                    : "Aucun employé sans poste disponible pour l'affectation."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {candidates.map((employee) => {
                    const active = selectedId === employee.id;
                    return (
                      <li key={employee.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(employee.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                            active
                              ? "bg-sky-500/15 ring-1 ring-sky-500/40"
                              : "hover:bg-[var(--shell-hover)]"
                          )}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xs font-bold text-sky-500">
                            {employee.prenom.charAt(0)}
                            {employee.nom.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[var(--shell-text)]">
                              {employeeDisplayName(employee)}
                            </p>
                            <p className="truncate text-xs text-[var(--shell-text-muted)]">
                              {employee.matricule} · {employee.department}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {selectedEmployee && (
              <div className="shrink-0 space-y-3 border-t border-[var(--shell-border)] px-4 py-3">
                <div>
                  <p className="text-xs text-[var(--shell-text-muted)]">Employé sélectionné</p>
                  <p className="text-sm font-semibold text-[var(--shell-text)]">
                    {employeeDisplayName(selectedEmployee)}
                  </p>
                  <p className="text-[11px] text-[var(--shell-text-muted)]">
                    {selectedEmployee.matricule}
                  </p>
                </div>
                <label className="block text-sm">
                  <span className="text-xs text-[var(--shell-text-muted)]">Date d&apos;affectation</span>
                  <input
                    type="date"
                    value={movementDate}
                    onChange={(e) => setMovementDate(e.target.value)}
                    className="input mt-1 w-full"
                    disabled={saving}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs text-[var(--shell-text-muted)]">
                    Motif / justification
                  </span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Motif de l'affectation (optionnel)…"
                    className="input mt-1 w-full resize-none"
                    disabled={saving}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {selectedEmployee ? (
                <MouvementPayrollPreview
                  key={`${position.id}-${selectedEmployee.id}`}
                  payrollConfig={position.payroll}
                  employee={selectedEmployee}
                  extraCosts={draftCosts}
                  onExtraCostsChange={(costs) =>
                    setDraftCosts((prev) => ({
                      ...costs,
                      currency: prev.currency ?? position.payroll.currency,
                    }))
                  }
                  disabled={saving}
                />
              ) : (
                <div className="flex min-h-[20rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--shell-border)] px-4 py-8 text-center text-sm text-[var(--shell-text-muted)]">
                  <Briefcase className="h-8 w-8 opacity-40" />
                  <p>Sélectionnez un employé pour afficher le bulletin du poste et les coûts extra.</p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--shell-border)] px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm font-medium text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!selectedEmployee || saving}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Affectation…
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Affecter
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
