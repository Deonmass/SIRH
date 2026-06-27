"use client";

import { X } from "lucide-react";
import type { CourseVehicule } from "@/lib/repositories/courses-vehicule";
import type { Employee } from "@/lib/types";
import { employeeDisplayName } from "@/lib/extra-costs";
import { cn, formatDate } from "@/lib/utils";

const STATUT_LABELS: Record<CourseVehicule["statut"], string> = {
  demande: "Demande",
  affecte: "Affectée",
  en_cours: "En cours",
  terminee: "Terminée",
};

function statutClass(statut: CourseVehicule["statut"]): string {
  if (statut === "demande") return "bg-amber-500/15 text-amber-400";
  if (statut === "affecte") return "bg-sky-500/15 text-sky-400";
  if (statut === "en_cours") return "bg-violet-500/15 text-violet-400";
  return "bg-emerald-500/15 text-emerald-400";
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

export function CourseVehiculeDetailModal({
  course,
  employee,
  onClose,
}: {
  course: CourseVehicule;
  employee?: Employee;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--shell-border)] bg-[var(--shell-bg)] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Course n° {course.id}</h3>
            <p className="mt-0.5 text-sm text-[var(--shell-text-muted)]">
              {formatDate(course.dateDemande)}
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
          <DetailSection title="Demande">
            <DetailRow
              label="Statut"
              value={
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    statutClass(course.statut)
                  )}
                >
                  {STATUT_LABELS[course.statut]}
                </span>
              }
            />
            <DetailRow
              label="Agent"
              value={
                employee ? (
                  <span>
                    {employeeDisplayName(employee)}
                    <span className="ml-2 text-xs text-[var(--shell-text-muted)]">
                      {course.matriculeAgent}
                    </span>
                  </span>
                ) : (
                  course.matriculeAgent
                )
              }
            />
            <DetailRow label="Type de course" value={course.typeCourseDesignation ?? "—"} />
            <DetailRow label="Départ" value={course.depart ?? "—"} />
            <DetailRow label="Destination" value={course.destination ?? "—"} />
            <DetailRow
              label="Motif"
              value={
                course.motif ? (
                  <span className="whitespace-pre-wrap">{course.motif}</span>
                ) : (
                  "—"
                )
              }
            />
          </DetailSection>

          {(course.vehiculeId || course.chauffeur) && (
            <DetailSection title="Affectation">
              <DetailRow label="Véhicule" value={course.vehiculePlaque ?? "—"} />
              <DetailRow label="Chauffeur" value={course.chauffeur ?? "—"} />
            </DetailSection>
          )}

          {course.statut === "terminee" && (
            <DetailSection title="Exécution">
              <DetailRow label="Km départ" value={course.kmhDepart ?? "—"} />
              <DetailRow label="Km arrivée" value={course.kmhArrive ?? "—"} />
              <DetailRow
                label="Niveau carburant"
                value={course.niveauCarburant != null ? `${course.niveauCarburant} %` : "—"}
              />
              <DetailRow label="Passagers" value={course.passagers ?? 0} />
              <DetailRow
                label="Observations"
                value={
                  course.observations ? (
                    <span className="whitespace-pre-wrap">{course.observations}</span>
                  ) : (
                    "—"
                  )
                }
              />
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  );
}

export { STATUT_LABELS, statutClass };
