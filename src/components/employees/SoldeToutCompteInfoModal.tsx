"use client";

import { useEffect } from "react";
import { Info, X } from "lucide-react";
import { SOLDE_TOUT_COMPTE_INFO_SECTIONS } from "@/lib/solde-tout-compte";

export function SoldeToutCompteInfoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="solde-info-title"
      >
        <header className="flex items-center justify-between gap-4 border-b border-[var(--shell-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 id="solde-info-title" className="font-semibold text-[var(--shell-text)]">
                Calcul du solde de tout compte
              </h2>
              <p className="text-xs text-[var(--shell-text-muted)]">
                Règles appliquées dans cette simulation (Code du travail RDC)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {SOLDE_TOUT_COMPTE_INFO_SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="text-sm font-semibold text-[var(--shell-text)]">{section.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--shell-text-muted)]">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <footer className="border-t border-[var(--shell-border)] px-6 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
          >
            Fermer
          </button>
        </footer>
      </div>
    </div>
  );
}
