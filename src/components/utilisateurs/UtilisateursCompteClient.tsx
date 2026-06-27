"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, Plus, Search, Table2, UserCircle, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { UtilisateurActionsMenu } from "@/components/utilisateurs/UtilisateurActionsMenu";
import { UtilisateurCreateModal } from "@/components/utilisateurs/UtilisateurCreateModal";
import { UtilisateurFormPanel } from "@/components/utilisateurs/UtilisateurFormPanel";
import { UtilisateurPasswordResetModal } from "@/components/utilisateurs/UtilisateurPasswordResetModal";
import type { UtilisateurRow } from "@/components/utilisateurs/types";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUsername, sectionHasAnyAction } from "@/lib/permissions";
import type { Employee } from "@/lib/types";
import { cn } from "@/lib/utils";

type PanelState = { mode: "edit"; user: UtilisateurRow } | null;
type ViewMode = "grid" | "table";

const VIEW_STORAGE_KEY = "sirh-utilisateurs-view";

function filterUsers(users: UtilisateurRow[], query: string): UtilisateurRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return users;
  return users.filter((user) => {
    const haystack = [
      user.username,
      user.matriculAgent ?? "",
      user.employeeName ?? "",
      user.createdBy ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function UtilisateursCompteClient({
  initialUsers,
  employees,
}: {
  initialUsers: UtilisateurRow[];
  employees: Employee[];
}) {
  const { can } = useAuth();
  const [users, setUsers] = useState(initialUsers);
  const [panel, setPanel] = useState<PanelState>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [passwordResetUser, setPasswordResetUser] = useState<UtilisateurRow | null>(null);
  const [passwordResetMsg, setPasswordResetMsg] = useState("");

  const canWrite = can("utilisateurs.comptes", "write");
  const canDelete = can("utilisateurs.comptes", "delete");
  const canManagePermissions =
    can("utilisateurs.permissions", "read") || can("utilisateurs.comptes", "write");

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "grid" || stored === "table") setViewMode(stored);
  }, []);

  function changeView(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  }

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/utilisateurs");
    if (res.ok) {
      setUsers((await res.json()) as UtilisateurRow[]);
    }
  }, []);

  const filteredUsers = useMemo(
    () => filterUsers(users, searchQuery),
    [users, searchQuery]
  );

  async function handleSetActive(user: UtilisateurRow, next: boolean) {
    if (!canWrite || isAdminUsername(user.username) || user.actif === next) return;
    setBusyId(user.id);
    setError("");
    try {
      const res = await fetch(`/api/utilisateurs/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: next }),
      });
      const data = (await res.json()) as UtilisateurRow & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Mise à jour impossible");
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === data.id ? { ...u, ...data } : u)));
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(user: UtilisateurRow) {
    const next = !user.actif;
    const verb = next ? "Réactiver" : "Désactiver";
    if (!confirm(`${verb} le compte « ${user.username} » ?`)) return;
    await handleSetActive(user, next);
  }

  async function handleDelete(user: UtilisateurRow) {
    if (!canDelete || isAdminUsername(user.username)) return;
    if (!confirm(`Supprimer le compte « ${user.username} » ?`)) return;
    setBusyId(user.id);
    setError("");
    try {
      const res = await fetch(`/api/utilisateurs/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Suppression impossible");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      if (panel?.mode === "edit" && panel.user.id === user.id) setPanel(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Utilisateurs (${filteredUsers.length})`}
        description={
          searchQuery.trim()
            ? `Recherche « ${searchQuery.trim()} » — comptes et permissions`
            : "Comptes, permissions et journal d'activité."
        }
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative min-w-[12rem] max-w-xs flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-muted)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un compte…"
              className="input w-full py-2 pl-9 pr-8 text-sm"
              aria-label="Rechercher un compte"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                aria-label="Effacer la recherche"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div
            className="inline-flex rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-1"
            role="group"
            aria-label="Mode d'affichage"
          >
            <button
              type="button"
              onClick={() => changeView("grid")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                viewMode === "grid"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
              )}
              title="Vue grille"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grille</span>
            </button>
            <button
              type="button"
              onClick={() => changeView("table")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                viewMode === "table"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
              )}
              title="Vue tableau"
            >
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">Tableau</span>
            </button>
          </div>

          {canWrite && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-sky-500 hover:to-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Ajouter compte
            </button>
          )}
        </div>
      </PageHeader>

      <UtilisateurPasswordResetModal
        user={passwordResetUser}
        open={!!passwordResetUser}
        onClose={() => setPasswordResetUser(null)}
        onSaved={() => {
          setPasswordResetMsg(
            `Mot de passe réinitialisé pour « ${passwordResetUser?.username} »`
          );
          window.setTimeout(() => setPasswordResetMsg(""), 4000);
        }}
      />

      {passwordResetMsg && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          {passwordResetMsg}
        </p>
      )}

      <UtilisateurCreateModal
        open={createOpen}
        employees={employees}
        onClose={() => setCreateOpen(false)}
        onSaved={(user) => {
          void refreshList();
          setUsers((prev) => {
            const idx = prev.findIndex((u) => u.id === user.id);
            if (idx === -1) return [...prev, user];
            const next = [...prev];
            next[idx] = user;
            return next;
          });
        }}
      />

      {panel && (
        <UtilisateurFormPanel
          mode="edit"
          initial={panel.user}
          employees={employees}
          onCancel={() => setPanel(null)}
          onSaved={(user) => {
            void refreshList();
            setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...user } : u)));
            setPanel(null);
          }}
        />
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {filteredUsers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--shell-border)] px-4 py-8 text-center text-sm text-[var(--shell-text-muted)]">
          Aucun compte ne correspond à votre recherche.
        </p>
      ) : viewMode === "table" ? (
        <UtilisateursTable
          users={filteredUsers}
          canWrite={canWrite}
          canDelete={canDelete}
          canManagePermissions={canManagePermissions}
          busyId={busyId}
          onEdit={(user) => setPanel({ mode: "edit", user })}
          onResetPassword={setPasswordResetUser}
          onSetActive={handleSetActive}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
      ) : (
        <UtilisateursGrid
          users={filteredUsers}
          canWrite={canWrite}
          canDelete={canDelete}
          canManagePermissions={canManagePermissions}
          busyId={busyId}
          onEdit={(user) => setPanel({ mode: "edit", user })}
          onResetPassword={setPasswordResetUser}
          onSetActive={handleSetActive}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function UtilisateursTable({
  users,
  canWrite,
  canDelete,
  canManagePermissions,
  busyId,
  onEdit,
  onResetPassword,
  onSetActive,
  onToggleActive,
  onDelete,
}: {
  users: UtilisateurRow[];
  canWrite: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
  busyId: string | null;
  onEdit: (user: UtilisateurRow) => void;
  onResetPassword: (user: UtilisateurRow) => void;
  onSetActive: (user: UtilisateurRow, active: boolean) => void;
  onToggleActive: (user: UtilisateurRow) => void;
  onDelete: (user: UtilisateurRow) => void;
}) {
  const showActions = canWrite || canDelete || canManagePermissions;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--shell-border)]">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--shell-border)] bg-[var(--shell-surface)] text-left text-xs uppercase tracking-wider text-[var(--shell-text-muted)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Utilisateur</th>
            <th className="px-4 py-3 font-semibold">Employé lié</th>
            <th className="px-4 py-3 font-semibold">Permissions</th>
            <th className="px-4 py-3 font-semibold">Statut</th>
            <th className="px-4 py-3 font-semibold">Créé le</th>
            {showActions && <th className="w-12 px-2 py-3" aria-label="Actions" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--shell-border)]">
          {users.map((user) => (
            <UtilisateurTableRow
              key={user.id}
              user={user}
              canWrite={canWrite}
              canDelete={canDelete}
              canManagePermissions={canManagePermissions}
              showActions={showActions}
              busyId={busyId}
              onEdit={onEdit}
              onResetPassword={onResetPassword}
              onSetActive={onSetActive}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UtilisateurTableRow({
  user,
  canWrite,
  canDelete,
  canManagePermissions,
  showActions,
  busyId,
  onEdit,
  onResetPassword,
  onSetActive,
  onToggleActive,
  onDelete,
}: {
  user: UtilisateurRow;
  canWrite: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
  showActions: boolean;
  busyId: string | null;
  onEdit: (user: UtilisateurRow) => void;
  onResetPassword: (user: UtilisateurRow) => void;
  onSetActive: (user: UtilisateurRow, active: boolean) => void;
  onToggleActive: (user: UtilisateurRow) => void;
  onDelete: (user: UtilisateurRow) => void;
}) {
  const admin = isAdminUsername(user.username);
  const hasPerms =
    admin || Object.keys(user.permissions).some((k) => sectionHasAnyAction(user.permissions, k));

  return (
    <tr className={cn("hover:bg-[var(--shell-hover)]/50", !user.actif && "opacity-60")}>
      <td className="px-4 py-3">
        <UtilisateurIdentity user={user} admin={admin} />
      </td>
      <td className="px-4 py-3 text-[var(--shell-text-muted)]">
        <EmployeeLink user={user} />
      </td>
      <td className="px-4 py-3">
        <PermissionsBadge admin={admin} hasPerms={hasPerms} actif={user.actif} />
      </td>
      <td className="px-4 py-3">
        <CompteActifToggle
          active={user.actif}
          disabled={!canWrite || admin || busyId === user.id}
          onChange={(next) => onSetActive(user, next)}
        />
      </td>
      <td className="px-4 py-3 text-xs text-[var(--shell-text-muted)]">
        {new Date(user.createdAt).toLocaleDateString("fr-FR")}
      </td>
      {showActions && (
        <td className="px-2 py-3 text-right">
          <UtilisateurActionsMenu
            user={user}
            canWrite={canWrite}
            canDelete={canDelete}
            canManagePermissions={canManagePermissions}
            busyId={busyId}
            onEdit={onEdit}
            onResetPassword={onResetPassword}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
          />
        </td>
      )}
    </tr>
  );
}

function UtilisateursGrid({
  users,
  canWrite,
  canDelete,
  canManagePermissions,
  busyId,
  onEdit,
  onResetPassword,
  onSetActive,
  onToggleActive,
  onDelete,
}: {
  users: UtilisateurRow[];
  canWrite: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
  busyId: string | null;
  onEdit: (user: UtilisateurRow) => void;
  onResetPassword: (user: UtilisateurRow) => void;
  onSetActive: (user: UtilisateurRow, active: boolean) => void;
  onToggleActive: (user: UtilisateurRow) => void;
  onDelete: (user: UtilisateurRow) => void;
}) {
  const showActions = canWrite || canDelete || canManagePermissions;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {users.map((user) => {
        const admin = isAdminUsername(user.username);
        const hasPerms =
          admin ||
          Object.keys(user.permissions).some((k) => sectionHasAnyAction(user.permissions, k));
        return (
          <article
            key={user.id}
            className={cn(
              "relative flex flex-col rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-4 transition hover:border-sky-500/30 hover:shadow-md",
              !user.actif && "opacity-60"
            )}
          >
            {showActions && (
              <div className="absolute right-2 top-2">
                <UtilisateurActionsMenu
                  user={user}
                  canWrite={canWrite}
                  canDelete={canDelete}
                  canManagePermissions={canManagePermissions}
                  busyId={busyId}
                  onEdit={onEdit}
                  onResetPassword={onResetPassword}
                  onToggleActive={onToggleActive}
                  onDelete={onDelete}
                />
              </div>
            )}
            <div className="flex items-start justify-between gap-3 pr-8">
              <UtilisateurIdentity user={user} admin={admin} />
              <CompteActifToggle
                active={user.actif}
                disabled={!canWrite || admin || busyId === user.id}
                onChange={(next) => onSetActive(user, next)}
                compact
              />
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--shell-text-muted)]">
                  Employé lié
                </p>
                <div className="mt-0.5 text-[var(--shell-text-muted)]">
                  <EmployeeLink user={user} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--shell-text-muted)]">
                  Permissions
                </p>
                <div className="mt-0.5">
                  <PermissionsBadge admin={admin} hasPerms={hasPerms} actif={user.actif} />
                </div>
              </div>
              <p className="text-xs text-[var(--shell-text-muted)]">
                Créé le {new Date(user.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function UtilisateurIdentity({ user, admin }: { user: UtilisateurRow; admin: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <UserCircle className="h-4 w-4 shrink-0 text-[var(--shell-text-muted)]" />
      <span className="font-medium text-[var(--shell-text)]">{user.username}</span>
      {admin && (
        <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-600">
          Admin
        </span>
      )}
      {!user.actif && (
        <span className="rounded-md bg-slate-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
          Désactivé
        </span>
      )}
    </div>
  );
}

function EmployeeLink({ user }: { user: UtilisateurRow }) {
  if (!user.matriculAgent) {
    return <span className="text-xs italic">—</span>;
  }
  return (
    <span>
      <span className="font-mono text-xs">{user.matriculAgent}</span>
      {user.employeeName ? (
        <span className="ml-1 text-[var(--shell-text)]">— {user.employeeName}</span>
      ) : null}
    </span>
  );
}

function CompteActifToggle({
  active,
  disabled,
  onChange,
  compact = false,
}: {
  active: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-2",
        compact ? "shrink-0" : "",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
    >
      {!compact && (
        <span className="text-xs text-[var(--shell-text-muted)]">
          {active ? "Actif" : "Inactif"}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={active ? "Compte actif" : "Compte inactif"}
        disabled={disabled}
        onClick={() => onChange(!active)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors",
          active ? "bg-sky-600" : "bg-slate-400/40",
          disabled && "pointer-events-none"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
            active ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </label>
  );
}

function PermissionsBadge({
  admin,
  hasPerms,
  actif,
}: {
  admin: boolean;
  hasPerms: boolean;
  actif: boolean;
}) {
  if (!actif) {
    return <span className="text-xs text-slate-500">Compte désactivé</span>;
  }
  if (admin) {
    return <span className="text-xs text-emerald-600 dark:text-emerald-400">Accès complet</span>;
  }
  if (hasPerms) {
    return <span className="text-xs text-[var(--shell-text-muted)]">Droits définis</span>;
  }
  return <span className="text-xs text-[var(--shell-text-muted)]">Aucun droit</span>;
}
