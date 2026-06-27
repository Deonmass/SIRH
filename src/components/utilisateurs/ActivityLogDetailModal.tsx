"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, Eye, RotateCcw, ScrollText, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ENTITY_LABELS,
} from "@/lib/activity-log-labels";
import {
  buildActivityStateSections,
  buildEnrichedActivityJson,
  changeRows,
  getEntryChanges,
  type ActivityStateSection,
} from "@/lib/activity-log-display";
import type { ActivityLogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTION_BADGE: Record<string, string> = {
  insertion: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  modification: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  suppression: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  desactivation: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  activation: "border-lime-500/30 bg-lime-500/10 text-lime-300",
  connexion: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  annulation: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
};

type DetailTab = "changes" | "before" | "after" | "full";

function formatLogDate(iso: string): string {
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm:ss", { locale: fr });
  } catch {
    return iso;
  }
}

function JsonBlock({ value }: { value: unknown }) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  return (
    <pre className="max-h-[50vh] overflow-auto rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] p-4 font-mono text-xs leading-relaxed text-[var(--shell-text)]">
      {text}
    </pre>
  );
}

function StatePanel({
  sections,
  emptyMessage,
  variant,
}: {
  sections: ActivityStateSection[];
  emptyMessage: string;
  variant: "before" | "after";
}) {
  if (sections.length === 0) {
    return <p className="text-sm text-[var(--shell-text-muted)]">{emptyMessage}</p>;
  }

  const accent =
    variant === "before"
      ? "border-rose-500/25 bg-rose-500/5"
      : "border-emerald-500/25 bg-emerald-500/5";

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section
          key={section.title}
          className={cn("overflow-hidden rounded-xl border", accent)}
        >
          <header className="border-b border-[var(--shell-border)]/60 px-4 py-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
              {section.title}
            </h4>
          </header>
          <dl className="divide-y divide-[var(--shell-border)]/50">
            {section.rows.map((row) => (
              <div
                key={row.key}
                className={cn(
                  "grid gap-1 px-4 py-3 sm:grid-cols-[minmax(8rem,11rem)_1fr]",
                  row.highlight && "bg-[var(--shell-surface)]/60"
                )}
              >
                <dt className="text-xs font-medium text-[var(--shell-text-muted)]">{row.label}</dt>
                <dd className="text-sm font-medium text-[var(--shell-text)]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function ChangesPanel({
  entry,
}: {
  entry: ActivityLogEntry;
}) {
  const changes = getEntryChanges(entry);
  const rows = changes ? changeRows(changes) : [];

  if (rows.length === 0) {
    const hasPayload = Boolean(entry.payloadBefore || entry.payloadAfter);
    return (
      <p className="text-sm text-[var(--shell-text-muted)]">
        {hasPayload
          ? "Aucun changement lisible n'a pu être extrait de cette action."
          : "Les données détaillées n'ont pas été enregistrées pour cette entrée (journal legacy)."}
      </p>
    );
  }

  const isInsertion = entry.action === "insertion";
  const isSuppression = entry.action === "suppression";

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--shell-text-muted)]">
        {isInsertion
          ? "Valeurs créées par cette action :"
          : isSuppression
            ? "Valeurs supprimées par cette action :"
            : `${rows.length} champ(s) modifié(s) :`}
      </p>
      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {rows.map((row) => (
          <div
            key={row.field}
            className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-3"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--shell-text-muted)]">
              {row.label}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {!isInsertion && (
                <span className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-rose-200/90">
                  {row.before}
                </span>
              )}
              {!isInsertion && !isSuppression && (
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--shell-text-muted)]" aria-hidden />
              )}
              {!isSuppression && (
                <span className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-200/90">
                  {row.after}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityLogDetailModal({
  entry,
  open,
  onClose,
  canUndo,
  canDelete,
  onUndo,
  onDelete,
  undoing,
  deleting,
}: {
  entry: ActivityLogEntry | null;
  open: boolean;
  onClose: () => void;
  canUndo: boolean;
  canDelete: boolean;
  onUndo: (entry: ActivityLogEntry) => void;
  onDelete: (entry: ActivityLogEntry) => void;
  undoing: boolean;
  deleting: boolean;
}) {
  const [tab, setTab] = useState<DetailTab>("changes");
  const [showRawJson, setShowRawJson] = useState(false);

  const resolvedChanges = entry ? getEntryChanges(entry) : null;
  const hasChanges = Boolean(resolvedChanges && Object.keys(resolvedChanges).length > 0);
  const beforeSections = entry
    ? buildActivityStateSections(entry.payloadBefore, entry.entityType)
    : [];
  const afterSections = entry
    ? buildActivityStateSections(entry.payloadAfter, entry.entityType)
    : [];
  const detailJson = entry ? buildEnrichedActivityJson(entry) : {};

  useEffect(() => {
    if (!open) return;
    setShowRawJson(false);
    setTab(
      entry?.action === "insertion"
        ? hasChanges
          ? "changes"
          : "after"
        : entry?.action === "suppression"
          ? hasChanges
            ? "changes"
            : "before"
          : "changes"
    );
  }, [open, entry?.id, entry?.action, hasChanges]);

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

  if (!open || !entry) return null;

  const showUndo = canUndo && entry.canUndo && !entry.undoneAt;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="activity-log-detail-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--shell-border)] px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                <ScrollText className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="activity-log-detail-title"
                  className="font-semibold text-[var(--shell-text)]"
                >
                  Détail de l&apos;action
                </h2>
                <p className="text-xs text-[var(--shell-text-muted)]">
                  {formatLogDate(entry.createdAt)} — {entry.utilisateur ?? "—"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className={ACTION_BADGE[entry.action] ?? ""}>
                {ACTIVITY_ACTION_LABELS[entry.action] ?? entry.action}
              </Badge>
              <Badge className="border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--shell-text-muted)]">
                {ACTIVITY_ENTITY_LABELS[entry.entityType] ?? entry.entityType}
              </Badge>
              {entry.undoneAt ? (
                <Badge className="border-zinc-500/30 bg-zinc-500/10 text-zinc-300">
                  Annulée
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-[var(--shell-text)]">{entry.summary}</p>
            {entry.entityLabel ? (
              <p className="text-xs text-[var(--shell-text-muted)]">
                {entry.entityLabel}
                {entry.entityId ? ` (${entry.entityId})` : ""}
              </p>
            ) : null}
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

        <div className="flex shrink-0 gap-1 border-b border-[var(--shell-border)] px-6 pt-3">
          {(
            [
              ["changes", "Changements"],
              ["before", "État avant"],
              ["after", "État après"],
              ["full", "JSON complet"],
            ] as const
          ).map(([id, label]) => {
            const disabled =
              (id === "before" && !entry.payloadBefore && beforeSections.length === 0) ||
              (id === "after" && !entry.payloadAfter && afterSections.length === 0) ||
              (id === "changes" && !hasChanges && !entry.payloadBefore && !entry.payloadAfter);
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => setTab(id)}
                className={cn(
                  "rounded-t-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40",
                  tab === id
                    ? "border-b-2 border-sky-500 text-[var(--shell-text)]"
                    : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {tab === "changes" ? <ChangesPanel entry={entry} /> : null}
          {tab === "before" ? (
            <div className="space-y-4">
              <StatePanel
                sections={beforeSections}
                emptyMessage="Aucun état avant enregistré."
                variant="before"
              />
              {entry.payloadBefore ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRawJson((v) => !v)}
                    className="text-xs font-medium text-sky-500 hover:underline"
                  >
                    {showRawJson ? "Masquer le JSON brut" : "Voir le JSON brut"}
                  </button>
                  {showRawJson ? (
                    <div className="mt-2">
                      <JsonBlock value={entry.payloadBefore} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {tab === "after" ? (
            <div className="space-y-4">
              <StatePanel
                sections={afterSections}
                emptyMessage="Aucun état après enregistré."
                variant="after"
              />
              {entry.payloadAfter ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRawJson((v) => !v)}
                    className="text-xs font-medium text-sky-500 hover:underline"
                  >
                    {showRawJson ? "Masquer le JSON brut" : "Voir le JSON brut"}
                  </button>
                  {showRawJson ? (
                    <div className="mt-2">
                      <JsonBlock value={entry.payloadAfter} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {tab === "full" ? <JsonBlock value={detailJson} /> : null}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--shell-border)] px-6 py-4">
          <p className="text-xs text-[var(--shell-text-muted)]">
            ID #{entry.id}
            {entry.undoneAt
              ? ` — annulée le ${formatLogDate(entry.undoneAt)} par ${entry.undoneBy ?? "—"}`
              : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
            >
              Fermer
            </button>
            {showUndo ? (
              <button
                type="button"
                onClick={() => onUndo(entry)}
                disabled={undoing || deleting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                {undoing ? "Annulation…" : "Annuler l'action"}
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => onDelete(entry)}
                disabled={undoing || deleting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}

export function ActivityLogActionButtons({
  entry,
  canUndo,
  canDelete,
  onView,
  onUndo,
  onDelete,
  undoingId,
  deletingId,
}: {
  entry: ActivityLogEntry;
  canUndo: boolean;
  canDelete: boolean;
  onView: (entry: ActivityLogEntry) => void;
  onUndo: (entry: ActivityLogEntry) => void;
  onDelete: (entry: ActivityLogEntry) => void;
  undoingId: string | null;
  deletingId: string | null;
}) {
  const showUndo = canUndo && entry.canUndo && !entry.undoneAt;

  const busy = undoingId === entry.id || deletingId === entry.id;

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onView(entry)}
        title="Voir le détail"
        aria-label="Voir le détail"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--shell-border)] text-[var(--shell-text)] hover:bg-[var(--shell-surface-hover)]"
      >
        <Eye className="h-4 w-4" />
      </button>
      {showUndo ? (
        <button
          type="button"
          onClick={() => onUndo(entry)}
          disabled={busy}
          title="Annuler l'action"
          aria-label="Annuler l'action"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 text-amber-200 hover:bg-amber-500/10 disabled:opacity-50"
        >
          <RotateCcw
            className={cn("h-4 w-4", undoingId === entry.id && "animate-spin")}
          />
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={() => onDelete(entry)}
          disabled={busy}
          title="Supprimer l'entrée"
          aria-label="Supprimer l'entrée"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
        >
          <Trash2
            className={cn("h-4 w-4", deletingId === entry.id && "animate-pulse")}
          />
        </button>
      ) : null}
    </div>
  );
}
