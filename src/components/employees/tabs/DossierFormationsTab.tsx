"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Eye, LayoutGrid, UserPlus, X } from "lucide-react";
import { employeeToParticipant } from "@/components/formations/AddParticipantModal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { HistoryCardsView, PanelCard } from "../DossierDataViews";
import type { DossierSectionView } from "../DossierViewToggle";
import { readApiError, showSuccessAlert, showWarningAlert } from "@/lib/alerts";
import {
  formationStatusBadgeClass,
  formationStatusLabel,
} from "@/lib/formations-utils";
import type { Employee, EmployeeDossier, FormationParticipant, FormationRecord } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type FormationHistoryView = "grid" | "timeline";

function FormationHistoryViewToggle({
  view,
  onChange,
}: {
  view: FormationHistoryView;
  onChange: (v: FormationHistoryView) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-0.5"
      role="group"
      aria-label="Affichage de l'historique des formations"
    >
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
          view === "grid"
            ? "bg-sky-600 text-white"
            : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Grille
      </button>
      <button
        type="button"
        onClick={() => onChange("timeline")}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
          view === "timeline"
            ? "bg-sky-600 text-white"
            : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        Ligne de temps
      </button>
    </div>
  );
}

function FormationDetailModal({
  formation,
  participant,
  onClose,
}: {
  formation: FormationRecord;
  participant?: FormationParticipant;
  onClose: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Période", value: `${formatDate(formation.dateDebut)} – ${formatDate(formation.dateFin)}` },
    { label: "Statut", value: formationStatusLabel(formation.status) },
    { label: "Niveau", value: formation.niveau || "—" },
    { label: "Instructeur", value: formation.instructeur || "—" },
    {
      label: "Cote",
      value: participant?.cote != null ? String(participant.cote) : "—",
    },
    {
      label: "Objectif",
      value: participant?.point_a_atteindre != null ? String(participant.point_a_atteindre) : "—",
    },
    { label: "Commentaire", value: formation.commentaire?.trim() || "—" },
  ];

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="formation-detail-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 id="formation-detail-title" className="text-lg font-semibold text-[var(--shell-text)]">
              {formation.titre}
            </h4>
            <Badge className={cn("mt-2 text-[10px]", formationStatusBadgeClass(formation.status))}>
              {formationStatusLabel(formation.status)}
            </Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 hover:bg-[var(--shell-hover)]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="space-y-3">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--shell-text-muted)]">
                {row.label}
              </dt>
              <dd className="mt-0.5 text-sm text-[var(--shell-text)]">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex justify-end border-t border-[var(--shell-border)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function FormationListItem({
  formation,
  action,
}: {
  formation: FormationRecord;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--shell-text)]">{formation.titre}</p>
        <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">
          {formatDate(formation.dateDebut)} – {formatDate(formation.dateFin)}
          {formation.niveau ? ` · ${formation.niveau}` : ""}
        </p>
        {formation.instructeur && (
          <p className="mt-0.5 truncate text-xs text-[var(--shell-text-muted)]">{formation.instructeur}</p>
        )}
        <div className="mt-2">
          <Badge className={cn("text-[10px]", formationStatusBadgeClass(formation.status))}>
            {formationStatusLabel(formation.status)}
          </Badge>
        </div>
      </div>
      {action}
    </div>
  );
}

export function DossierFormationsTab({
  employee,
}: {
  employee: Employee;
  view?: DossierSectionView;
  onViewChange?: (v: DossierSectionView) => void;
  onPatchDossier?: (p: Partial<EmployeeDossier>) => void;
  showViewToggle?: boolean;
}) {
  const [formations, setFormations] = useState<FormationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [historyView, setHistoryView] = useState<FormationHistoryView>("grid");
  const [detailId, setDetailId] = useState<string | null>(null);

  const loadFormations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/formations");
      if (!res.ok) throw new Error(await readApiError(res));
      setFormations((await res.json()) as FormationRecord[]);
    } catch {
      setFormations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFormations();
  }, [loadFormations]);

  const participatedIds = useMemo(
    () =>
      new Set(
        formations
          .filter((f) => f.participants.some((p) => p.employe_id === employee.id))
          .map((f) => f.id)
      ),
    [formations, employee.id]
  );

  const participatedFormations = useMemo(
    () =>
      [...formations]
        .filter((f) => participatedIds.has(f.id))
        .sort((a, b) => b.dateFin.localeCompare(a.dateFin)),
    [formations, participatedIds]
  );

  const availableFormations = useMemo(
    () =>
      [...formations].sort((a, b) => {
        const statusOrder = { a_venir: 0, en_cours: 1, terminee: 2 };
        const sa = statusOrder[a.status] - statusOrder[b.status];
        if (sa !== 0) return sa;
        return a.dateDebut.localeCompare(b.dateDebut);
      }),
    [formations]
  );

  const detailFormation = detailId ? formations.find((f) => f.id === detailId) : null;
  const detailParticipant = detailFormation?.participants.find((p) => p.employe_id === employee.id);

  async function participate(formation: FormationRecord) {
    if (participatedIds.has(formation.id)) {
      await showWarningAlert(
        "Déjà inscrit",
        `${employee.prenom} ${employee.nom} participe déjà à la formation « ${formation.titre} ».`
      );
      return;
    }

    setJoiningId(formation.id);
    try {
      const nextParticipants = [...formation.participants, employeeToParticipant(employee)];
      const res = await fetch(`/api/formations/${formation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participation: nextParticipants }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const updated = (await res.json()) as FormationRecord;
      setFormations((list) => list.map((f) => (f.id === updated.id ? updated : f)));
      await showSuccessAlert("Inscription enregistrée", `Participation à « ${formation.titre} » confirmée.`);
    } catch (e) {
      await showWarningAlert(
        "Inscription impossible",
        e instanceof Error ? e.message : "Une erreur est survenue."
      );
    } finally {
      setJoiningId(null);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PanelCard title="Formations disponibles">
        <p className="mb-3 text-xs text-[var(--shell-text-muted)]">
          Inscrivez l&apos;agent à une formation du catalogue.
        </p>
        {availableFormations.length === 0 ? (
          <p className="text-sm text-[var(--shell-text-muted)]">Aucune formation enregistrée.</p>
        ) : (
          <ul className="space-y-2">
            {availableFormations.map((f) => (
              <li key={f.id}>
                <FormationListItem
                  formation={f}
                  action={
                    <button
                      type="button"
                      disabled={joiningId === f.id}
                      onClick={() => void participate(f)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Participer
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <div>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--shell-text)]">Historique des formations</h3>
            <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">
              Formations auxquelles {employee.prenom} participe
            </p>
          </div>
          <FormationHistoryViewToggle view={historyView} onChange={setHistoryView} />
        </div>

        {historyView === "grid" ? (
          <HistoryCardsView
            items={participatedFormations}
            emptyMessage="Aucune participation enregistrée."
            renderCard={(item) => {
              const f = item as FormationRecord;
              return (
                <div
                  key={f.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--shell-text)]">{f.titre}</p>
                    <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">
                      {formatDate(f.dateDebut)} – {formatDate(f.dateFin)}
                    </p>
                    <div className="mt-2">
                      <Badge className={cn("text-[10px]", formationStatusBadgeClass(f.status))}>
                        {formationStatusLabel(f.status)}
                      </Badge>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailId(f.id)}
                    className="shrink-0 rounded-md p-1.5 text-sky-400 transition hover:bg-[var(--shell-hover)] hover:text-sky-300"
                    aria-label="Voir la formation"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              );
            }}
          />
        ) : (
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/40 p-4">
            {participatedFormations.length === 0 ? (
              <p className="text-sm text-[var(--shell-text-muted)]">Aucune participation enregistrée.</p>
            ) : (
              <div className="space-y-3">
                {participatedFormations.map((f, idx, arr) => (
                  <div key={f.id} className="relative flex items-start gap-2 pl-6">
                    <span className="absolute left-1.5 top-2 h-2 w-2 rounded-full bg-sky-500" />
                    {idx < arr.length - 1 && (
                      <span className="absolute left-[7px] top-4 h-[calc(100%+10px)] w-px bg-[var(--shell-border)]" />
                    )}
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="text-xs text-[var(--shell-text-muted)]">
                        {formatDate(f.dateDebut)} – {formatDate(f.dateFin)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-[var(--shell-text)]">{f.titre}</p>
                        <Badge className={cn("text-[10px]", formationStatusBadgeClass(f.status))}>
                          {formationStatusLabel(f.status)}
                        </Badge>
                      </div>
                      {f.instructeur && (
                        <p className="text-xs text-[var(--shell-text-muted)]">{f.instructeur}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailId(f.id)}
                      className="shrink-0 rounded-md p-1.5 text-sky-400 transition hover:bg-[var(--shell-hover)]"
                      aria-label="Voir la formation"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {detailFormation && (
        <FormationDetailModal
          formation={detailFormation}
          participant={detailParticipant}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
