"use client";

import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { MatriculeEmployeeField } from "@/components/utilisateurs/MatriculeEmployeeField";
import type { UtilisateurRow } from "@/components/utilisateurs/types";
import { SaveButton } from "@/components/ui/SaveButton";
import { isAdminUsername } from "@/lib/permissions";
import type { Employee } from "@/lib/types";

export function UtilisateurFormPanel({
  mode,
  initial,
  employees,
  onCancel,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: UtilisateurRow | null;
  employees: Employee[];
  onCancel: () => void;
  onSaved: (user: UtilisateurRow) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [matriculAgent, setMatriculAgent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isAdminAccount = initial ? isAdminUsername(initial.username) : false;

  useEffect(() => {
    setUsername(initial?.username ?? "");
    setPassword("");
    setMatriculAgent(initial?.matriculAgent ?? "");
    setError("");
  }, [initial, mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (mode === "create" && !password) {
        setError("Mot de passe requis pour un nouveau compte");
        return;
      }

      const payload = {
        username: username.trim(),
        matriculAgent: matriculAgent.trim() || null,
        ...(password ? { password } : {}),
      };

      const url =
        mode === "create" ? "/api/utilisateurs" : `/api/utilisateurs/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "create" ? { ...payload, password } : payload),
      });
      const data = (await res.json()) as UtilisateurRow & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'enregistrement");
        return;
      }
      onSaved(data);
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--shell-border)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600/15 text-sky-600">
            <UserPlus className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--shell-text)]">
              {mode === "create" ? "Nouveau compte" : `Modifier — ${initial?.username}`}
            </h2>
            <p className="text-xs text-[var(--shell-text-muted)]">
              Identifiants et liaison employé — les permissions se configurent dans l&apos;onglet
              Permissions.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
          aria-label="Fermer le formulaire"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-[var(--shell-text-muted)]">Nom d&apos;utilisateur</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isAdminAccount}
              required
              className="input mt-1 w-full"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--shell-text-muted)]">
              {mode === "create" ? "Mot de passe" : "Nouveau mot de passe (optionnel)"}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={mode === "create"}
              className="input mt-1 w-full"
              autoComplete="new-password"
            />
          </label>
          <div className="sm:col-span-2">
            <MatriculeEmployeeField
              employees={employees}
              value={matriculAgent}
              onChange={setMatriculAgent}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-[var(--shell-border)] pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm font-medium text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
          >
            Annuler
          </button>
          <SaveButton
            type="submit"
            saving={saving}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            {mode === "create" ? "Créer le compte" : "Enregistrer"}
          </SaveButton>
        </div>
      </form>
    </section>
  );
}
