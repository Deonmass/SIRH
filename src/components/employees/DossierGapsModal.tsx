"use client";

import { X } from "lucide-react";
import type { DossierGapCategory } from "@/lib/employee-dossier-completion";
import { dossierCompletionTextClass } from "@/lib/employee-dossier-completion";
import { cn } from "@/lib/utils";

export function DossierGapsModal({
  completionPercent,
  categories,
  onClose,
}: {
  completionPercent: number;
  categories: DossierGapCategory[];
  onClose: () => void;
}) {
  const totalMissing = categories.reduce((n, c) => n + c.items.length, 0);

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="dossier-gaps-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--shell-border)] px-5 py-4">
          <div>
            <h4 id="dossier-gaps-title" className="text-lg font-semibold text-[var(--shell-text)]">
              Complétion du dossier
            </h4>
            <p className="mt-1 text-sm text-[var(--shell-text-muted)]">
              <span className={cn("font-bold", dossierCompletionTextClass(completionPercent))}>
                {completionPercent}%
              </span>
              {totalMissing > 0
                ? ` · ${totalMissing} élément${totalMissing > 1 ? "s" : ""} à compléter`
                : " · dossier complet"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-[var(--shell-hover)]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {categories.length === 0 ? (
            <p className="text-center text-sm text-emerald-600">
              Tous les champs suivis sont renseignés.
            </p>
          ) : (
            <div className="space-y-5">
              {categories.map((cat) => (
                <section key={cat.tabId}>
                  <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-600">
                    {cat.label}
                  </h5>
                  <ul className="space-y-1.5">
                    {cat.items.map((item) => (
                      <li
                        key={`${cat.tabId}-${item}`}
                        className="flex items-start gap-2 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2 text-sm text-[var(--shell-text)]"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
