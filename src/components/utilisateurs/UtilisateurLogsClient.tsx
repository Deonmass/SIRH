"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Filter, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyTable, StickyThead, Td, Th } from "@/components/layout/StickyTable";
import { Badge } from "@/components/ui/Badge";
import {
  ActivityLogActionButtons,
  ActivityLogDetailModal,
} from "@/components/utilisateurs/ActivityLogDetailModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ENTITY_LABELS,
} from "@/lib/activity-log-labels";
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

function formatLogDate(iso: string): string {
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: fr });
  } catch {
    return iso;
  }
}

function defaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultDateTo(): string {
  return new Date().toISOString().slice(0, 10);
}

export function UtilisateurLogsClient({
  initialLogs,
  initialUsers,
}: {
  initialLogs: ActivityLogEntry[];
  initialUsers: string[];
}) {
  const { can } = useAuth();
  const canUndo = can("utilisateurs.logs", "write");
  const canDelete = can("utilisateurs.logs", "delete");
  const showActions = canUndo || canDelete;

  const [logs, setLogs] = useState(initialLogs);
  const [users, setUsers] = useState(initialUsers);
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [utilisateur, setUtilisateur] = useState("");
  const [loading, setLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null);
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const active = logs.filter((l) => !l.undoneAt).length;
    const undone = logs.filter((l) => l.undoneAt).length;
    return { total: logs.length, active, undone };
  }, [logs]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (utilisateur) params.set("utilisateur", utilisateur);
      if (dateFrom) params.set("from", `${dateFrom}T00:00:00.000Z`);
      if (dateTo) params.set("to", `${dateTo}T23:59:59.999Z`);

      const [logsRes, usersRes] = await Promise.all([
        fetch(`/api/logs?${params.toString()}`),
        fetch("/api/logs?users=1"),
      ]);

      if (!logsRes.ok) {
        const data = (await logsRes.json()) as { error?: string };
        throw new Error(data.error ?? "Chargement impossible");
      }

      setLogs((await logsRes.json()) as ActivityLogEntry[]);
      if (usersRes.ok) {
        const data = (await usersRes.json()) as { users: string[] };
        setUsers(data.users);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, utilisateur]);

  async function handleUndo(entry: ActivityLogEntry) {
    if (!canUndo || !entry.canUndo || entry.undoneAt) return;
    if (
      !confirm(
        `Annuler cette action ?\n\n${entry.summary}\n\nL'état précédent sera restauré.`
      )
    ) {
      return;
    }

    setUndoingId(entry.id);
    setError("");
    try {
      const res = await fetch(`/api/logs/${entry.id}/undo`, { method: "POST" });
      const data = (await res.json()) as ActivityLogEntry & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Annulation impossible");
      setSelectedEntry(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Annulation impossible");
    } finally {
      setUndoingId(null);
    }
  }

  async function handleDelete(entry: ActivityLogEntry) {
    if (!canDelete) return;
    if (
      !confirm(
        `Supprimer définitivement cette entrée du journal ?\n\n${entry.summary}\n\nCette opération est irréversible.`
      )
    ) {
      return;
    }

    setDeletingId(entry.id);
    setError("");
    try {
      const res = await fetch(`/api/logs/${entry.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Suppression impossible");
      setSelectedEntry(null);
      setLogs((prev) => prev.filter((l) => l.id !== entry.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Journal d'activité"
        description="Historique des actions avec détail JSON (avant / après / changements), annulation et suppression."
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--shell-text)]">
          <Filter className="h-4 w-4 text-[var(--shell-text-muted)]" />
          Filtres
        </div>

        <label className="flex flex-col gap-1 text-xs text-[var(--shell-text-muted)]">
          Du
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2 text-sm text-[var(--shell-text)]"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-[var(--shell-text-muted)]">
          Au
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2 text-sm text-[var(--shell-text)]"
          />
        </label>

        <label className="flex min-w-[180px] flex-col gap-1 text-xs text-[var(--shell-text-muted)]">
          Utilisateur
          <select
            value={utilisateur}
            onChange={(e) => setUtilisateur(e.target.value)}
            className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2 text-sm text-[var(--shell-text)]"
          >
            <option value="">Tous</option>
            {users.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg bg-[var(--shell-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Chargement…" : "Appliquer"}
        </button>

        <button
          type="button"
          onClick={() => {
            setDateFrom(defaultDateFrom());
            setDateTo(defaultDateTo());
            setUtilisateur("");
          }}
          className="rounded-lg border border-[var(--shell-border)] px-3 py-2 text-sm text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
        >
          Réinitialiser
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-[var(--shell-text-muted)]">
        <span>
          <ScrollText className="mr-1 inline h-4 w-4" />
          {stats.total} entrée{stats.total > 1 ? "s" : ""}
        </span>
        <span>{stats.active} active{stats.active > 1 ? "s" : ""}</span>
        <span>{stats.undone} annulée{stats.undone > 1 ? "s" : ""}</span>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <StickyTable>
        <StickyThead>
          <tr>
            <Th>Date</Th>
            <Th>Utilisateur</Th>
            <Th>Action</Th>
            <Th>Entité</Th>
            <Th>Résumé</Th>
            <Th>Statut</Th>
            {showActions ? <Th className="text-right">Actions</Th> : null}
          </tr>
        </StickyThead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td
                colSpan={showActions ? 7 : 6}
                className="px-4 py-10 text-center text-sm text-[var(--shell-text-muted)]"
              >
                Aucune activité pour cette période.
              </td>
            </tr>
          ) : (
            logs.map((entry) => (
              <tr
                key={entry.id}
                className={cn(
                  "border-b border-[var(--shell-border)]/60",
                  entry.undoneAt && "opacity-60"
                )}
              >
                <Td className="whitespace-nowrap text-xs text-[var(--shell-text-muted)]">
                  {formatLogDate(entry.createdAt)}
                </Td>
                <Td className="font-medium text-[var(--shell-text)]">
                  {entry.utilisateur ?? "—"}
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    className="text-left"
                  >
                    <Badge className={ACTION_BADGE[entry.action] ?? ""}>
                      {ACTIVITY_ACTION_LABELS[entry.action] ?? entry.action}
                    </Badge>
                  </button>
                </Td>
                <Td className="text-[var(--shell-text-muted)]">
                  <div>{ACTIVITY_ENTITY_LABELS[entry.entityType] ?? entry.entityType}</div>
                  {entry.entityLabel ? (
                    <div className="text-xs text-[var(--shell-text-muted)]">{entry.entityLabel}</div>
                  ) : null}
                </Td>
                <Td className="max-w-md">
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    className="text-left text-[var(--shell-text)] underline-offset-2 hover:text-sky-300 hover:underline"
                  >
                    {entry.summary}
                  </button>
                </Td>
                <Td>
                  {entry.undoneAt ? (
                    <Badge className="border-zinc-500/30 bg-zinc-500/10 text-zinc-300">
                      Annulée
                    </Badge>
                  ) : (
                    <Badge className="border-emerald-500/20 bg-emerald-500/5 text-emerald-300">
                      Active
                    </Badge>
                  )}
                </Td>
                {showActions ? (
                  <Td className="text-right">
                    <ActivityLogActionButtons
                      entry={entry}
                      canUndo={canUndo}
                      canDelete={canDelete}
                      onView={setSelectedEntry}
                      onUndo={(e) => void handleUndo(e)}
                      onDelete={(e) => void handleDelete(e)}
                      undoingId={undoingId}
                      deletingId={deletingId}
                    />
                  </Td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </StickyTable>

      <ActivityLogDetailModal
        entry={selectedEntry}
        open={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        canUndo={canUndo}
        canDelete={canDelete}
        onUndo={(e) => void handleUndo(e)}
        onDelete={(e) => void handleDelete(e)}
        undoing={undoingId === selectedEntry?.id}
        deleting={deletingId === selectedEntry?.id}
      />
    </div>
  );
}
