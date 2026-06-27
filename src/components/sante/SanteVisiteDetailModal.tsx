"use client";

import { ExternalLink, X } from "lucide-react";
import type { HopitalVisite } from "@/lib/repositories/hopital-visite";
import {
  SANTE_VISITE_VALIDATION_LABELS,
  formatSanteVisiteStatutDate,
  getSanteVisiteStatut,
  getSanteVisiteStatutDate,
  getSanteVisiteStatutDateLabel,
  parseSanteVisiteValidation,
} from "@/lib/sante-visite";
import type { Employee } from "@/lib/types";
import { employeeDisplayName } from "@/lib/extra-costs";
import { cn, formatDate } from "@/lib/utils";

function formatMontant(value?: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

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

function validationBadgeClass(statut: ReturnType<typeof normalizeSanteValidation>): string {
  if (statut === "valide") return "bg-emerald-500/15 text-emerald-400";
  if (statut === "rejete") return "bg-red-500/15 text-red-400";
  return "bg-amber-500/15 text-amber-400";
}

export function SanteVisiteDetailModal({
  visite,
  employee,
  onClose,
  onOpenFile,
}: {
  visite: HopitalVisite;
  employee?: Employee;
  onClose: () => void;
  onOpenFile: (ref: string) => void;
}) {
  const validation = getSanteVisiteStatut(visite.validation);
  const validationRecord = parseSanteVisiteValidation(visite.validation);
  const actionDate = getSanteVisiteStatutDate(validationRecord);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--shell-border)] bg-[var(--shell-bg)] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Détail de la visite</h3>
            <p className="mt-0.5 text-sm text-[var(--shell-text-muted)]">
              Visite n° {visite.id}
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

        <div className="space-y-4 p-6">
          <DetailSection title="Agent">
            <DetailRow
              label="Nom complet"
              value={employee ? employeeDisplayName(employee) : "—"}
            />
            <DetailRow label="Matricule" value={visite.matriculeAgent ?? "—"} />
            {employee?.department && (
              <DetailRow label="Département" value={employee.department} />
            )}
          </DetailSection>

          <DetailSection title="Visite médicale">
            <DetailRow label="Hôpital" value={visite.hopital ?? "—"} />
            <DetailRow
              label="Date de visite"
              value={visite.dateVisite ? formatDate(visite.dateVisite) : "—"}
            />
            <DetailRow
              label="Motif"
              value={
                visite.motif ? (
                  <span className="whitespace-pre-wrap">{visite.motif}</span>
                ) : (
                  "—"
                )
              }
            />
          </DetailSection>

          <DetailSection title="Financier">
            <DetailRow label="Montant" value={formatMontant(visite.montant)} />
          </DetailSection>

          <DetailSection title="Pièces jointes">
            {(visite.fichiers ?? []).length === 0 ? (
              <DetailRow label="Fichiers" value="Aucune pièce jointe" />
            ) : (
              <div className="space-y-2">
                {(visite.fichiers ?? []).map((f) => (
                  <button
                    key={f.ref}
                    type="button"
                    onClick={() => onOpenFile(f.ref)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--shell-border)] px-3 py-2 text-left text-sm text-sky-500 hover:bg-[var(--shell-hover)]"
                  >
                    <span className="truncate">{f.name}</span>
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </DetailSection>

          <DetailSection title="Statut & suivi">
            <DetailRow
              label="Statut"
              value={
                <span
                  className={cn(
                    "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                    validationBadgeClass(validation)
                  )}
                >
                  {SANTE_VISITE_VALIDATION_LABELS[validation]}
                </span>
              }
            />
            {actionDate && (
              <DetailRow
                label={getSanteVisiteStatutDateLabel(validation)}
                value={formatSanteVisiteStatutDate(actionDate)}
              />
            )}
            {validationRecord.nomValidateur && (
              <DetailRow label="Validateur" value={validationRecord.nomValidateur} />
            )}
            {validationRecord.matriculeValidateur && (
              <DetailRow
                label="Matricule validateur"
                value={
                  <span className="font-mono text-xs">{validationRecord.matriculeValidateur}</span>
                }
              />
            )}
            {validationRecord.raisonRejet && (
              <DetailRow
                label="Motif rejet"
                value={
                  <span className="whitespace-pre-wrap text-red-400">
                    {validationRecord.raisonRejet}
                  </span>
                }
              />
            )}
            <DetailRow
              label="Créé le"
              value={
                visite.createdAt
                  ? formatDate(visite.createdAt.slice(0, 10))
                  : "—"
              }
            />
            <DetailRow
              label="Modifié le"
              value={
                visite.updatedAt
                  ? formatDate(visite.updatedAt.slice(0, 10))
                  : "—"
              }
            />
            {visite.createdBy && <DetailRow label="Créé par" value={visite.createdBy} />}
            {visite.updatedBy && <DetailRow label="Modifié par" value={visite.updatedBy} />}
          </DetailSection>
        </div>

        <div className="border-t border-[var(--shell-border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm hover:bg-[var(--shell-hover)]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
