"use client";

import { X } from "lucide-react";
import { CharroiTypesCoursePanel } from "@/components/charroi/CharroiTypesCoursePanel";
import type { TypeCours } from "@/lib/repositories/type-cours";

export function CharroiTypesCourseModal({
  onClose,
  onTypesChange,
}: {
  onClose: () => void;
  onTypesChange?: (types: TypeCours[]) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--shell-border)] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--shell-text)]">Types de course</h3>
            <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">
              Référentiel des types de déplacement
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
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <CharroiTypesCoursePanel onTypesChange={onTypesChange} />
        </div>
      </div>
    </div>
  );
}
