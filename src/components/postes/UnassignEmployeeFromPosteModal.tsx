"use client";

import { useState } from "react";
import { Loader2, UserMinus, X } from "lucide-react";
import { employeeDisplayName } from "@/lib/extra-costs";
import { readApiError, showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import type { Employee, JobPosition } from "@/lib/types";
import { cn } from "@/lib/utils";

export function UnassignEmployeeFromPosteModal({
  position,
  employee,
  onClose,
  onUnassigned,
  elevated = false,
}: {
  position: JobPosition;
  employee: Employee;
  onClose: () => void;
  onUnassigned: (employee: Employee) => void;
  elevated?: boolean;
}) {
  const [movementDate, setMovementDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          type: "desaffectation",
          date: movementDate,
          reason: reason.trim() || `Désaffectation du poste ${position.title}`,
          effectiveDate: movementDate,
          legalBasis: "Désaffectation",
        }),
      });
      if (!res.ok) {
        await showErrorAlert("Désaffectation impossible", await readApiError(res));
        return;
      }
      const data = (await res.json()) as { employee: Employee };
      await showSuccessAlert(
        "Employé désaffecté",
        `${employeeDisplayName(data.employee)} n'est plus affecté(e) au poste « ${position.title} ».`
      );
      onUnassigned(data.employee);
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
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-popover)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="unassign-poste-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--shell-border)] px-5 py-4">
          <div className="min-w-0">
            <h3 id="unassign-poste-title" className="font-semibold text-[var(--shell-text)]">
              Désaffecter l&apos;employé
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

        <form onSubmit={(e) => void submit(e)} className="space-y-4 px-5 py-4">
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] px-4 py-3">
            <p className="text-xs text-[var(--shell-text-muted)]">Employé concerné</p>
            <p className="text-sm font-semibold text-[var(--shell-text)]">
              {employeeDisplayName(employee)}
            </p>
            <p className="text-[11px] text-[var(--shell-text-muted)]">{employee.matricule}</p>
          </div>

          <label className="block text-sm">
            <span className="text-xs text-[var(--shell-text-muted)]">Date de désaffectation</span>
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
            <span className="text-xs text-[var(--shell-text-muted)]">Motif / justification</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Motif de la désaffectation (optionnel)…"
              className="input mt-1 w-full resize-none"
              disabled={saving}
            />
          </label>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--shell-border)] pt-4">
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
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Désaffectation…
                </>
              ) : (
                <>
                  <UserMinus className="h-4 w-4" />
                  Désaffecter
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
