"use client";

import { X } from "lucide-react";
import type { TypeCours } from "@/lib/repositories/type-cours";
import { formatDate } from "@/lib/utils";

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-500">{title}</h4>
      <dl className="mt-3 space-y-2.5">{children}</dl>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-xs text-[var(--shell-text-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--shell-text)]">{value}</dd>
    </div>
  );
}

export function TypeCoursDetailModal({
  typeCours,
  onClose,
}: {
  typeCours: TypeCours;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--shell-border)] bg-[var(--shell-bg)] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Type de course</h3>
            <p className="mt-0.5 text-sm text-[var(--shell-text-muted)]">Référentiel n° {typeCours.id}</p>
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

        <div className="space-y-4 p-6">
          <DetailSection title="Informations">
            <DetailRow label="Désignation" value={typeCours.designation} />
          </DetailSection>

          <DetailSection title="Traçabilité">
            <DetailRow
              label="Créé le"
              value={typeCours.createdAt ? formatDate(typeCours.createdAt) : "—"}
            />
            <DetailRow
              label="Modifié le"
              value={typeCours.updatedAt ? formatDate(typeCours.updatedAt) : "—"}
            />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
