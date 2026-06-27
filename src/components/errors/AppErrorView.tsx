"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Database,
  Home,
  RefreshCw,
  SearchX,
  WifiOff,
} from "lucide-react";
import type { AppErrorContent, AppErrorKind } from "@/lib/app-errors";
import { getAppErrorContent } from "@/lib/app-errors";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<
  AppErrorKind,
  { icon: typeof WifiOff; ring: string; iconBg: string; iconColor: string }
> = {
  network: {
    icon: WifiOff,
    ring: "ring-amber-500/30",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
  },
  not_found: {
    icon: SearchX,
    ring: "ring-sky-500/30",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-400",
  },
  database: {
    icon: Database,
    ring: "ring-violet-500/30",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
  },
  server: {
    icon: AlertTriangle,
    ring: "ring-rose-500/30",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-400",
  },
};

export function AppErrorView({
  kind,
  title,
  message,
  hint,
  code,
  onRetry,
  fullPage = false,
  className,
}: AppErrorContent & {
  code?: string | number;
  onRetry?: () => void;
  fullPage?: boolean;
  className?: string;
}) {
  const resolved = getAppErrorContent(kind);
  const displayTitle = title ?? resolved.title;
  const displayMessage = message ?? resolved.message;
  const displayHint = hint ?? resolved.hint;
  const style = KIND_STYLE[kind];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-16 text-center",
        fullPage ? "min-h-screen bg-[var(--shell-bg)]" : "min-h-[min(70vh,32rem)]",
        className
      )}
      role="alert"
    >
      <div
        className={cn(
          "w-full max-w-lg rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80 p-8 shadow-xl backdrop-blur-sm ring-1",
          style.ring
        )}
      >
        <div
          className={cn(
            "mx-auto mb-5 inline-flex rounded-2xl p-4",
            style.iconBg,
            style.iconColor
          )}
        >
          <Icon className="h-10 w-10" strokeWidth={1.75} />
        </div>

        {code != null && (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--shell-text-muted)]">
            Erreur {code}
          </p>
        )}

        <h1 className="text-xl font-semibold text-[var(--shell-text)] sm:text-2xl">
          {displayTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--shell-text-muted)]">
          {displayMessage}
        </p>
        {displayHint && (
          <p className="mt-2 text-xs leading-relaxed text-[var(--shell-text-muted)]/90">
            {displayHint}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </button>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-bg)] px-4 py-2.5 text-sm font-medium text-[var(--shell-text)] transition hover:bg-[var(--shell-hover)]"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
