"use client";

import { useEffect, useState } from "react";
import { KeyRound, X } from "lucide-react";
import type { UtilisateurRow } from "@/components/utilisateurs/types";
import { SaveButton } from "@/components/ui/SaveButton";

export function UtilisateurPasswordResetModal({
  user,
  open,
  onClose,
  onSaved,
}: {
  user: UtilisateurRow | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setConfirm("");
    setError("");
  }, [open, user?.id]);

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

  if (!open || !user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 3) {
      setError("Le mot de passe doit contenir au moins 3 caractères");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/utilisateurs/${user!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Impossible de réinitialiser le mot de passe");
        return;
      }
      onSaved?.();
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
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="password-reset-title"
      >
        <header className="flex items-center justify-between gap-4 border-b border-[var(--shell-border)] px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="password-reset-title"
                className="truncate font-semibold text-[var(--shell-text)]"
              >
                Réinitialiser le mot de passe
              </h2>
              <p className="truncate text-xs text-[var(--shell-text-muted)]">
                Compte : {user.username}
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
          <p className="text-sm text-[var(--shell-text-muted)]">
            Saisissez le nouveau mot de passe. L&apos;utilisateur devra l&apos;utiliser à la
            prochaine connexion.
          </p>

          <label className="block">
            <span className="text-xs text-[var(--shell-text-muted)]">Nouveau mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="new-password"
              className="input mt-1 w-full"
            />
          </label>

          <label className="block">
            <span className="text-xs text-[var(--shell-text-muted)]">Confirmer le mot de passe</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="input mt-1 w-full"
            />
          </label>

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
              icon={KeyRound}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Enregistrer
            </SaveButton>
          </div>
        </form>
      </div>
    </div>
  );
}
