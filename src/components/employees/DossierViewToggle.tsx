"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type DossierSectionView = "cards" | "table";

export function DossierViewToggle({
  view,
  onChange,
  className,
  cardsLabel = "Cartes",
  tableLabel = "Tableau",
}: {
  view: DossierSectionView;
  onChange: (v: DossierSectionView) => void;
  className?: string;
  cardsLabel?: string;
  tableLabel?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-0.5",
        className
      )}
      role="group"
      aria-label="Mode d'affichage de la section"
    >
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
          view === "cards"
            ? "bg-sky-600 text-white"
            : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        {cardsLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
          view === "table"
            ? "bg-sky-600 text-white"
            : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
        )}
      >
        <Table2 className="h-3.5 w-3.5" />
        {tableLabel}
      </button>
    </div>
  );
}

export function DossierTabToolbar({
  title,
  description,
  view,
  onViewChange,
  showViewToggle = true,
  cardsLabel,
  tableLabel,
  actions,
  trailingActions,
}: {
  title: string;
  description?: string;
  view: DossierSectionView;
  onViewChange: (v: DossierSectionView) => void;
  showViewToggle?: boolean;
  cardsLabel?: string;
  tableLabel?: string;
  actions?: React.ReactNode;
  /** Actions alignées à droite (après le toggle vue). */
  trailingActions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--shell-text)]">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {(showViewToggle || trailingActions) && (
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          {showViewToggle && (
            <DossierViewToggle
              view={view}
              onChange={onViewChange}
              cardsLabel={cardsLabel}
              tableLabel={tableLabel}
            />
          )}
          {trailingActions}
        </div>
      )}
    </div>
  );
}
