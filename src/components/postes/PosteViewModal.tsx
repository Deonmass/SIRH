"use client";

import { useMemo, useState } from "react";
import { Briefcase, Pencil, X } from "lucide-react";
import { PosteEditNavLink } from "@/components/postes/PosteEditNavLink";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { SalarySimulator } from "@/components/payroll/SalarySimulator";
import { centreDesCoutsLabel } from "@/lib/centre-des-couts-utils";
import { mergePayrollWithEmployeeDependents } from "@/lib/payroll-simulator-config";
import { computePayrollFromPosition } from "@/lib/payroll-summary";
import { employeeOccupyingPosition } from "@/lib/poste-linking";
import {
  employeesOnPosition,
  formatRemainingSlotsLabel,
  remainingSlots,
} from "@/lib/poste-headcount";
import { statusLabel } from "@/lib/postes";
import type { Employee, JobPosition } from "@/lib/types";
import { useAppSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

type TabId = "fiche" | "paie";

const TABS = [
  { id: "fiche" as const, label: "Fiche de poste" },
  { id: "paie" as const, label: "Bulletin de paie" },
];

export function PosteViewModal({
  position,
  employees,
  parentTitle,
  onClose,
}: {
  position: JobPosition;
  employees: Employee[];
  parentTitle?: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabId>("fiche");
  const { formatSalary, settings, canViewSalaries } = useAppSettings();
  const centresCouts = settings.centresCouts ?? [];
  const occupants = employeesOnPosition(position.id, employees);
  const emp = occupants[0] ?? employeeOccupyingPosition(position, employees);
  const remaining = formatRemainingSlotsLabel(remainingSlots(position, employees));

  const centreLabel = useMemo(() => {
    if (!position.centreDesCoutsId) return "—";
    const centre = centresCouts.find((c) => c.id === position.centreDesCoutsId);
    return centre ? centreDesCoutsLabel(centre) : "—";
  }, [position.centreDesCoutsId, centresCouts]);

  const netSalary = useMemo(() => {
    if (!canViewSalaries) return null;
    return computePayrollFromPosition(position.payroll, settings).netSalary;
  }, [canViewSalaries, position.payroll, settings]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-card)] shadow-2xl",
          tab === "paie" ? "max-w-6xl" : "max-w-3xl"
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="poste-modal-title"
      >
        <div className="shrink-0 border-b border-[var(--shell-border)] bg-[var(--shell-card)]">
          <div className="flex items-start gap-4 px-6 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-500">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">
                {position.code}
              </p>
              <h2 id="poste-modal-title" className="text-xl font-bold text-[var(--shell-text)]">
                {position.title}
              </h2>
              <p className="mt-0.5 text-sm text-[var(--shell-text-muted)]">
                {position.department} · {position.grade} ·{" "}
                <span
                  className={cn(
                    "inline rounded-md px-1.5 py-0.5 text-xs font-semibold",
                    position.status === "vacant"
                      ? "badge-status-vacant"
                      : "bg-[var(--shell-hover)]"
                  )}
                >
                  {statusLabel(position.status)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--shell-text-muted)] transition hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex gap-1 px-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "border-b-2 px-4 py-2.5 text-sm font-medium transition",
                  tab === t.id
                    ? "border-sky-500 text-sky-600 dark:text-sky-400"
                    : "border-transparent text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {tab === "fiche" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-[var(--shell-text)]">Organisation</h3>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <InfoItem label="Supérieur hiérarchique" value={parentTitle ?? "— Racine —"} />
                    <InfoItem label="Site / lieu" value={position.location || "—"} />
                    <InfoItem label="Type de contrat" value={position.contractType} />
                    <InfoItem label="Centre de coûts" value={centreLabel} />
                    <InfoItem label="Effectif prévu" value={String(position.headcount)} />
                    <InfoItem
                      label={occupants.length > 1 ? "Titulaires" : "Titulaire"}
                      value={
                        occupants.length > 0
                          ? occupants
                              .map((o) => `${o.prenom} ${o.nom} (${o.matricule})`)
                              .join(" · ")
                          : "Poste vacant"
                      }
                      highlight={occupants.length === 0}
                    />
                    {remaining && (
                      <InfoItem label="Places disponibles" value={remaining} highlight />
                    )}
                    {canViewSalaries && netSalary != null && (
                      <InfoItem
                        label="Net à payer"
                        value={formatSalary(netSalary, position.payroll.currency)}
                      />
                    )}
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-[var(--shell-text)]">Description du poste</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TextBlock label="Résumé / périmètre" text={position.description} />
                  <TextBlock label="Missions principales" text={position.missions} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextBlock label="Exigences / formation" text={position.requirements} />
                    <TextBlock label="Compétences clés" text={position.competencies} />
                  </div>
                  <TextBlock label="Indicateurs de performance (KPI)" text={position.kpi} />
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "paie" && (
            <SalarySimulator
              embedded
              readOnly
              settings={settings}
              params={settings}
              payrollConfig={mergePayrollWithEmployeeDependents(
                position.payroll,
                emp
              )}
            />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--shell-border)] bg-[var(--shell-surface)] px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm font-medium text-[var(--shell-text-muted)] transition hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
          >
            Fermer
          </button>
          <PosteEditNavLink
            posteId={position.id}
            onNavigate={onClose}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </PosteEditNavLink>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--shell-text-muted)]">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm font-medium text-[var(--shell-text)]",
          highlight && "text-amber-600 dark:text-amber-400"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function TextBlock({ label, text }: { label: string; text?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--shell-text-muted)]">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--shell-text)]">
        {text?.trim() ? text : "—"}
      </p>
    </div>
  );
}
