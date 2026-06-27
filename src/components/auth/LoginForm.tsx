"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Loader2, Lock, User } from "lucide-react";
import { loginAction, type LoginActionState } from "@/lib/auth/login-action";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [state, formAction, pending] = useActionState<LoginActionState, FormData>(
    loginAction,
    null
  );

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-6 shadow-2xl shadow-black/20"
    >
      <input type="hidden" name="next" value={next} />

      <h2 className="text-lg font-semibold text-[var(--shell-text)]">Connexion</h2>
      <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
        Identifiez-vous pour accéder à l&apos;application
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-[var(--shell-text-muted)]">Utilisateur</span>
          <div className="relative mt-1">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-muted)]" />
            <input
              type="text"
              name="username"
              autoComplete="username"
              autoFocus
              required
              disabled={pending}
              className="input w-full pl-9"
              placeholder="Admin"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[var(--shell-text-muted)]">Mot de passe</span>
          <div className="relative mt-1">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-muted)]" />
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              disabled={pending}
              className="input w-full pl-9"
              placeholder="••••••"
            />
          </div>
        </label>
      </div>

      {state?.error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition",
          "bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600",
          "hover:from-sky-500 hover:via-indigo-500 hover:to-violet-500",
          "disabled:opacity-60"
        )}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Se connecter
      </button>

      <p className="mt-4 text-center text-[10px] text-[var(--shell-text-muted)]">
        Compte par défaut : Admin / 123
      </p>
    </form>
  );
}
