"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LEAVE_TYPE_LABELS } from "@/lib/employee-dossier";
import type { CongesCalendarDay } from "@/lib/conges-dashboard";
import { cn, formatDate } from "@/lib/utils";

export function CongesCalendarPanel({
  days,
  year,
  month,
}: {
  days: CongesCalendarDay[];
  year: number;
  month: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    day: CongesCalendarDay;
  } | null>(null);

  useEffect(() => setMounted(true), []);

  const firstDow = new Date(year, month, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const blanks = Array.from({ length: offset }, (_, i) => i);

  return (
    <div className="relative">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-[var(--shell-text-muted)]">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {blanks.map((b) => (
          <div key={`b-${b}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const n = Number(day.date.slice(8));
          const hasLeave = day.leaves.length > 0;
          return (
            <button
              key={day.date}
              type="button"
              className={cn(
                "relative aspect-square rounded-md border text-xs transition",
                hasLeave
                  ? "border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25"
                  : "border-[var(--shell-border)] text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
              )}
              onMouseEnter={(e) => {
                if (!hasLeave) return;
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ x: rect.left, y: rect.bottom + 6, day });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <span className="font-medium">{n}</span>
              {hasLeave && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sky-400" />
              )}
            </button>
          );
        })}
      </div>

      {mounted &&
        tooltip &&
        tooltip.day.leaves.length > 0 &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[200] max-w-xs rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] p-2.5 text-xs shadow-xl"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p className="mb-1.5 font-semibold text-[var(--shell-text)]">
              {formatDate(tooltip.day.date)}
            </p>
            <ul className="space-y-1">
              {tooltip.day.leaves.map((l) => (
                <li key={l.id} className="text-[var(--shell-text)]">
                  <span className="font-medium">{l.employeeName}</span>
                  <span className="text-[var(--shell-text-muted)]">
                    {" "}
                    — {LEAVE_TYPE_LABELS[l.type]}
                  </span>
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
