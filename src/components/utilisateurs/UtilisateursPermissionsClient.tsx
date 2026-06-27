"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PermissionsMatrixEditor } from "@/components/utilisateurs/PermissionsMatrixEditor";
import type { UtilisateurRow } from "@/components/utilisateurs/types";
import { SaveButton } from "@/components/ui/SaveButton";
import { useAuth } from "@/contexts/AuthContext";
import { emptyPermissionMatrix, isAdminUsername, type PermissionMatrix } from "@/lib/permissions";
import type { Utilisateur } from "@/lib/types";

export function UtilisateursPermissionsClient({
  initialUsers,
}: {
  initialUsers: Utilisateur[];
}) {
  const searchParams = useSearchParams();
  const { can } = useAuth();
  const [users, setUsers] = useState(initialUsers);
  const [selectedId, setSelectedId] = useState("");
  const [permissions, setPermissions] = useState<PermissionMatrix>(emptyPermissionMatrix());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canWrite =
    can("utilisateurs.comptes", "write") || can("utilisateurs.permissions", "write");

  const selected = useMemo(
    () => users.find((u) => u.id === selectedId) ?? null,
    [users, selectedId]
  );

  const isAdmin = selected ? isAdminUsername(selected.username) : false;

  useEffect(() => {
    if (users.length === 0) return;
    const fromUrl = searchParams.get("compte");
    const match = fromUrl ? users.find((u) => u.id === fromUrl) : null;
    setSelectedId(match?.id ?? users[0]!.id);
  }, [users, searchParams]);

  useEffect(() => {
    if (!selected) return;
    setPermissions(selected.permissions ?? emptyPermissionMatrix());
    setError("");
    setSuccess("");
  }, [selected]);

  async function handleSave() {
    if (!selected || !canWrite || isAdmin) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/utilisateurs/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      const data = (await res.json()) as UtilisateurRow & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'enregistrement");
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === data.id ? { ...u, ...data } : u)));
      setSuccess("Permissions enregistrées");
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  if (users.length === 0) {
    return (
      <>
        <PageHeader
          title="Permissions"
          description="Droits d'accès par page et par action."
        />
        <p className="text-sm text-[var(--shell-text-muted)]">
          Aucun compte —{" "}
          <Link href="/utilisateurs/compte" className="text-sky-500 hover:underline">
            créez un compte
          </Link>{" "}
          d&apos;abord.
        </p>
      </>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <PageHeader
        title="Permissions"
        description="Droits d'accès par page et par action."
      >
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
          {selected && isAdmin && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Accès complet
            </span>
          )}
          <span className="text-xs font-medium text-[var(--shell-text-muted)]">Compte</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="input min-w-[12rem] py-1.5 text-sm"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
                {isAdminUsername(user.username) ? " — Admin" : ""}
                {user.matriculAgent ? ` (${user.matriculAgent})` : ""}
              </option>
            ))}
          </select>
          {canWrite && !isAdmin && selected && (
            <SaveButton
              type="button"
              saving={saving}
              onClick={() => void handleSave()}
              className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-sky-500 hover:to-indigo-500"
            >
              Enregistrer
            </SaveButton>
          )}
        </div>
      </PageHeader>

      {(error || success) && (
        <div className="-mx-8 border-b border-[var(--shell-border)] px-8 py-2">
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
          )}
        </div>
      )}

      {selected && (
        <PermissionsMatrixEditor
          value={permissions}
          onChange={setPermissions}
          username={selected.username}
        />
      )}
    </div>
  );
}
