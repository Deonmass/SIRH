"use client";

import type { AppSettings, EmployeeKind } from "@/lib/types";
import { EMPLOYEE_KIND_LABELS, employeeKindBadgeClass } from "@/lib/employee-kind";
import { cn } from "@/lib/utils";

const KINDS: EmployeeKind[] = ["interne", "externe", "journalier"];

export function EmployeeKindFields({
  settings,
  employeeKind,
  subcontractorId,
  journalierProviderId,
  onChange,
  className,
  compact,
  inline,
  typeOnly,
  extrasOnly,
}: {
  settings: AppSettings;
  employeeKind: EmployeeKind;
  subcontractorId: string;
  journalierProviderId: string;
  onChange: (patch: {
    employeeKind?: EmployeeKind;
    subcontractorId?: string;
    journalierProviderId?: string;
  }) => void;
  className?: string;
  compact?: boolean;
  /** Affiche le sélecteur type à côté du titre de section. */
  inline?: boolean;
  /** Uniquement le type (barre d’outils). */
  typeOnly?: boolean;
  /** Uniquement sous-traitant / journalier. */
  extrasOnly?: boolean;
}) {
  const subcontractors = settings.subcontractors.filter((s) => s.active);
  const journaliers = settings.journalierProviders.filter((j) => j.active);
  const showType = !extrasOnly;
  const showExtras = !typeOnly;

  return (
    <div className={cn(inline ? "shrink-0" : "space-y-3", className)}>
      {showType && (
        <label className={cn("block text-sm", inline && "min-w-[10.5rem]")}>
          <span className="text-xs text-[var(--shell-text-muted)]">Type d&apos;employé</span>
          <select
            value={employeeKind}
            onChange={(e) => {
              const kind = e.target.value as EmployeeKind;
              onChange({
                employeeKind: kind,
                subcontractorId: kind === "externe" ? subcontractorId : "",
                journalierProviderId: kind === "journalier" ? journalierProviderId : "",
              });
            }}
            className={cn("input mt-1 w-full", (compact || inline) && "text-sm")}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {EMPLOYEE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      )}

      {showExtras && employeeKind === "externe" && (
        <label className="block text-sm">
          <span className="text-xs text-[var(--shell-text-muted)]">Sous-traitant *</span>
          <select
            required
            value={subcontractorId}
            onChange={(e) => onChange({ subcontractorId: e.target.value })}
            className={cn("input mt-1 w-full", compact && "text-sm")}
          >
            <option value="">— Sélectionner —</option>
            {subcontractors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.code ? ` (${s.code})` : ""}
              </option>
            ))}
          </select>
          {subcontractors.length === 0 && (
            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
              Ajoutez des sous-traitants dans Paramètres → Effectifs externes & journaliers.
            </p>
          )}
        </label>
      )}

      {showExtras && employeeKind === "journalier" && (
        <label className="block text-sm">
          <span className="text-xs text-[var(--shell-text-muted)]">Profil journalier *</span>
          <select
            required
            value={journalierProviderId}
            onChange={(e) => onChange({ journalierProviderId: e.target.value })}
            className={cn("input mt-1 w-full", compact && "text-sm")}
          >
            <option value="">— Sélectionner —</option>
            {journaliers.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
                {j.code ? ` (${j.code})` : ""}
              </option>
            ))}
          </select>
          {journaliers.length === 0 && (
            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
              Ajoutez des profils journaliers dans Paramètres → Effectifs externes & journaliers.
            </p>
          )}
        </label>
      )}
    </div>
  );
}

export function EmployeeKindBadge({
  kind,
  detail,
  className,
}: {
  kind: EmployeeKind;
  detail?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
          employeeKindBadgeClass(kind)
        )}
      >
        {EMPLOYEE_KIND_LABELS[kind]}
      </span>
      {detail && (
        <span className="text-[10px] text-[var(--shell-text-muted)] truncate max-w-[12rem]" title={detail}>
          {detail}
        </span>
      )}
    </div>
  );
}
