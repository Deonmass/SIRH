"use client";

import { CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const TIMELINE_ROWS = 4;
const TABLE_ROWS = 5;

function staggerStyle(index: number, stepMs = 120) {
  return { animationDelay: `${index * stepMs}ms` };
}

function TimelineRowSkeleton({ index, isLast }: { index: number; isLast: boolean }) {
  return (
    <div className="relative flex items-start gap-3 pl-8" style={staggerStyle(index)}>
      <span
        className="absolute left-[11px] top-[0.85rem] z-[1] h-3 w-3 rounded-full border-2 border-[var(--shell-surface)] bg-sky-500/50 shadow-[0_0_0_1px_var(--shell-border)] motion-safe:animate-pulse"
        style={staggerStyle(index, 180)}
      />
      {!isLast && (
        <span className="absolute left-[17px] top-6 bottom-0 w-0.5 bg-gradient-to-b from-sky-500/30 to-[var(--shell-border)]" />
      )}
      <div className="min-w-0 flex-1 border-b border-[var(--shell-border)] py-3 last:border-b-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Skeleton className="h-4 w-28 sm:w-36" style={staggerStyle(index, 100)} />
          <Skeleton className="h-5 w-20 rounded-full" style={staggerStyle(index, 140)} />
        </div>
        <Skeleton className="mt-2 h-3 w-44" style={staggerStyle(index, 160)} />
        <Skeleton className="mt-2 h-5 w-24 rounded-md" style={staggerStyle(index, 200)} />
        <Skeleton className="mt-2 h-3 w-full max-w-md" style={staggerStyle(index, 220)} />
      </div>
    </div>
  );
}

function TableRowSkeleton({ index }: { index: number }) {
  const widths = ["w-16", "w-32", "w-10", "w-24", "w-24", "w-20"];
  return (
    <div
      className="flex gap-3 border-b border-[var(--shell-border)]/60 px-3 py-3 last:border-b-0 sm:gap-4"
      style={staggerStyle(index)}
    >
      {widths.map((w, col) => (
        <Skeleton
          key={col}
          className={cn("h-3.5 shrink-0 flex-1", col === 0 ? "max-w-[4rem]" : w)}
          style={staggerStyle(index + col, 80)}
        />
      ))}
    </div>
  );
}

export function LeaveHistoryLoading({ variant }: { variant: "cards" | "table" }) {
  return (
    <div
      className="relative"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Chargement de l'historique des congés"
    >
      <div className="mb-4 flex items-center gap-2.5 text-sky-500/90">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
          <CalendarDays className="h-4 w-4 motion-safe:animate-pulse" aria-hidden />
          <span className="absolute inset-0 rounded-lg ring-1 ring-sky-500/25 motion-safe:animate-ping" />
        </span>
        <span className="text-sm font-medium text-[var(--shell-text-muted)]">
          Chargement de l&apos;historique
          <span className="inline-flex w-6 justify-start motion-safe:animate-pulse">…</span>
        </span>
      </div>

      {variant === "table" ? (
        <div className="overflow-hidden rounded-lg border border-[var(--shell-border)]">
          <div className="flex gap-3 border-b border-[var(--shell-border)] bg-[var(--shell-surface)]/60 px-3 py-2.5 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 flex-1 max-w-[4rem]" style={staggerStyle(i, 60)} />
            ))}
          </div>
          {Array.from({ length: TABLE_ROWS }).map((_, i) => (
            <TableRowSkeleton key={i} index={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-0">
          {Array.from({ length: TIMELINE_ROWS }).map((_, i) => (
            <TimelineRowSkeleton key={i} index={i} isLast={i === TIMELINE_ROWS - 1} />
          ))}
        </div>
      )}

      <span className="sr-only">Chargement de l&apos;historique des congés en cours</span>
    </div>
  );
}
