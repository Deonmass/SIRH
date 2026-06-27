"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DossierGapsModal } from "./DossierGapsModal";
import { EmployeeDossierTabs, type DossierTabId } from "./EmployeeDossierTabs";
import { Badge } from "@/components/ui/Badge";
import { useEmployeePersist } from "@/hooks/useEmployeePersist";
import { EmployeeKindBadge } from "@/components/employees/EmployeeKindFields";
import { STATUS_LABELS } from "@/lib/constants";
import { employeeKindDetail } from "@/lib/employee-kind";
import {
  formatSeniorityLabel,
  resolveEmployeeHireDate,
} from "@/lib/employee-seniority";
import {
  computeDossierGaps,
  computeDossierProgressPercent,
  computeDossierTabCompletions,
  dossierCompletionBadgeClass,
} from "@/lib/employee-dossier-completion";
import { cn } from "@/lib/utils";
import type { AppSettings, Employee, JobPosition } from "@/lib/types";

export function EmployeeDossierModal({
  employee: initial,
  settings,
  onClose,
  initialTab = "profil",
}: {
  employee: Employee;
  settings: AppSettings;
  onClose: () => void;
  initialTab?: DossierTabId;
}) {
  const { employee, save, saving, setFamily, dossierLoading } = useEmployeePersist(initial);
  const [showGapsModal, setShowGapsModal] = useState(false);
  const [linkedPosition, setLinkedPosition] = useState<JobPosition | null>(null);
  const status = STATUS_LABELS[employee.status];
  const completions = computeDossierTabCompletions(employee);
  const globalCompletion = computeDossierProgressPercent(completions);
  const dossierGaps = computeDossierGaps(employee);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) {
      document.body.style.paddingRight = `${scrollbar}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showGapsModal) {
        setShowGapsModal(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, showGapsModal]);

  useEffect(() => {
    if (!employee.positionId) {
      setLinkedPosition(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/postes/${encodeURIComponent(employee.positionId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: JobPosition | null) => {
        if (!cancelled) setLinkedPosition(data);
      })
      .catch(() => {
        if (!cancelled) setLinkedPosition(null);
      });
    return () => {
      cancelled = true;
    };
  }, [employee.positionId]);

  const postLocation = linkedPosition?.location?.trim();
  const seniority = formatSeniorityLabel(resolveEmployeeHireDate(employee));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-md overscroll-none sm:p-3"
      onClick={onClose}
      role="presentation"
      aria-modal="true"
    >
      <div
        className="flex h-[min(96vh,920px)] w-[min(98vw,1600px)] max-w-none flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="employee-dossier-title"
      >
        <div className="shrink-0 border-b border-[var(--shell-border)] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              {employee.photoUrl ? (
                <img
                  src={employee.photoUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/30 to-indigo-600/30 text-base font-bold text-sky-400">
                  {employee.prenom[0]}
                  {employee.nom[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-mono text-[var(--shell-text-muted)]">{employee.matricule}</p>
                <h2
                  id="employee-dossier-title"
                  className="truncate text-xl font-bold text-[var(--shell-text)]"
                >
                  {employee.prenom} {employee.postNom ? `${employee.postNom} ` : ""}
                  {employee.nom}
                </h2>
                <p className="truncate text-sm text-[var(--shell-text-muted)]">
                  {employee.positionId ? (
                    <>
                      {employee.position}
                      {postLocation ? ` · ${postLocation}` : ""}
                      {" · "}
                      {employee.department}
                    </>
                  ) : (
                    "Aucune fiche de poste liée"
                  )}
                  {seniority ? ` · Ancienneté ${seniority}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className={status.color}>{status.label}</Badge>
                  {employee.positionId && (
                    <>
                      <Badge className="bg-[var(--shell-surface)] text-[var(--shell-text-muted)] border-[var(--shell-border)]">
                        {employee.contractType}
                      </Badge>
                      <EmployeeKindBadge
                        kind={employee.employeeKind}
                        detail={employeeKindDetail(employee, settings)}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGapsModal(true)}
                className={cn(
                  "rounded-xl px-3 py-2 text-center transition hover:ring-2 hover:ring-sky-500/40",
                  dossierCompletionBadgeClass(globalCompletion)
                )}
                title="Voir les éléments non remplis"
              >
                <span className="block text-2xl font-bold leading-none tabular-nums">
                  {globalCompletion}%
                </span>
                <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide opacity-80">
                  Documents
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {showGapsModal && (
          <DossierGapsModal
            completionPercent={globalCompletion}
            categories={dossierGaps}
            onClose={() => setShowGapsModal(false)}
          />
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <EmployeeDossierTabs
            employee={employee}
            settings={settings}
            onSave={save}
            onFamilyChange={setFamily}
            saving={saving}
            dossierLoading={dossierLoading}
            defaultTab={initialTab}
            layout="vertical"
            forceView="table"
            hideViewToggle
            documentsDefaultView="table"
          />
        </div>
      </div>
    </div>
  );
}
