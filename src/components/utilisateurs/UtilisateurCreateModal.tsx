"use client";

import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { MatriculeEmployeeField } from "@/components/utilisateurs/MatriculeEmployeeField";
import type { UtilisateurRow } from "@/components/utilisateurs/types";
import { SaveButton } from "@/components/ui/SaveButton";
import type { Employee } from "@/lib/types";

export function UtilisateurCreateModal({
  open,
  employees,
  onClose,
  onSaved,
}: {
  open: boolean;
  employees: Employee[];
  onClose: () => void;
  onSaved: (user: UtilisateurRow) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [matriculAgent, setMatriculAgent] = useState("");
  const [actif, setActif] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setUsername("");
    setPassword("");
    setMatriculAgent("");
    setActif(true);
    setError("");
  }, [open]);

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

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Mot de passe requis pour un nouveau compte");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/utilisateurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          matriculAgent: matriculAgent.trim() || null,
          actif,
        }),
      });
      const data = (await res.json()) as UtilisateurRow & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la création");
        return;
      }
      onSaved(data);
      onClose();
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="create-user-title"
      >
        <header className="flex items-center justify-between gap-4 border-b border-[var(--shell-border)] px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600/15 text-sky-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="create-user-title"
                className="truncate font-semibold text-[var(--shell-text)]"
              >
                Nouveau compte
              </h2>
              <p className="text-xs text-[var(--shell-text-muted)]">
                Identifiants et liaison employé
              </p>
            </div>
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

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-[var(--shell-text-muted)]">Nom d&apos;utilisateur</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="off"
                className="input mt-1 w-full"
              />
            </label>
            <label className="block">
              <span className="text-xs text-[var(--shell-text-muted)]">Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="input mt-1 w-full"
              />
            </label>
            <div className="sm:col-span-2">
              <MatriculeEmployeeField
                employees={employees}
                value={matriculAgent}
                onChange={setMatriculAgent}
              />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--shell-border)] px-4 py-3 sm:col-span-2">
              <span>
                <span className="block text-sm font-medium text-[var(--shell-text)]">
                  Compte actif
                </span>
                <span className="text-xs text-[var(--shell-text-muted)]">
                  Désactivé = connexion refusée
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={actif}
                onClick={() => setActif((v) => !v)}
                className={cnToggle(actif)}
              >
                <span className={cnThumb(actif)} />
              </button>
            </label>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-[var(--shell-border)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm font-medium text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
            >
              Annuler
            </button>
            <SaveButton
              type="submit"
              saving={saving}
              icon={UserPlus}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Créer le compte
            </SaveButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function cnToggle(checked: boolean) {
  return [
    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
    checked ? "bg-sky-600" : "bg-slate-400/40",
  ].join(" ");
}

function cnThumb(checked: boolean) {
  return [
    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
    checked ? "translate-x-5" : "translate-x-0",
  ].join(" ");
}
