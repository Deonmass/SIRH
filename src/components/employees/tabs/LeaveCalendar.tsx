"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { LeaveRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function dateInRange(d: string, start: string, end: string) {
  return d >= start && d <= end;
}

export function LeaveCalendar({
  leaves,
  selectedStartDate,
  selectedEndDate,
  onSelectRange,
  selectionWorkingDays = 0,
  showAddAction = false,
  onAddSelection,
}: {
  leaves: LeaveRecord[];
  selectedStartDate: string;
  selectedEndDate: string;
  onSelectRange: (startIso: string, endIso: string) => void;
  selectionWorkingDays?: number;
  showAddAction?: boolean;
  onAddSelection?: () => void;
}) {
  const base = selectedStartDate ? new Date(selectedStartDate) : new Date();
  const [year, setYear] = useState(base.getFullYear());
  const [month, setMonth] = useState(base.getMonth());
  const [dragStart, setDragStart] = useState<string | null>(null);
  function normalizeRange(a: string, b: string) {
    return a <= b ? [a, b] : [b, a];
  }

  function isInSelectedRange(iso: string) {
    if (!selectedStartDate || !selectedEndDate) return false;
    return dateInRange(iso, selectedStartDate, selectedEndDate);
  }


  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    const cells: { iso: string; day: number; inMonth: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month, -startPad + i + 1);
      cells.push({
        iso: d.toISOString().slice(0, 10),
        day: d.getDate(),
        inMonth: false,
      });
    }
    for (let d = 1; d <= count; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ iso, day: d, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1];
      const next = new Date(last.iso);
      next.setDate(next.getDate() + 1);
      cells.push({
        iso: next.toISOString().slice(0, 10),
        day: next.getDate(),
        inMonth: false,
      });
    }
    return cells;
  }, [year, month]);

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={prevMonth} className="rounded p-1 hover:bg-[var(--shell-hover)]" aria-label="Mois précédent">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold">
          {MONTHS[month]} {year}
        </span>
        <div className="flex items-center gap-1">
          {showAddAction && onAddSelection && (
            <button
              type="button"
              onClick={onAddSelection}
              title="Nouvelle demande de congé"
              className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="tabular-nums">{selectionWorkingDays} j</span>
            </button>
          )}
          <button type="button" onClick={nextMonth} className="rounded p-1 hover:bg-[var(--shell-hover)]" aria-label="Mois suivant">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-[var(--shell-text-muted)]">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 font-medium">
            {w}
          </span>
        ))}
        {days.map((cell) => {
          const hasLeave = leaves.some((l) =>
            dateInRange(cell.iso, l.startDate, l.endDate)
          );
          const selected = isInSelectedRange(cell.iso);
          return (
            <button
              key={cell.iso + cell.day}
              type="button"
              onMouseDown={() => {
                setDragStart(cell.iso);
                onSelectRange(cell.iso, cell.iso);
              }}
              onMouseEnter={() => {
                if (dragStart) {
                  const [start, end] = normalizeRange(dragStart, cell.iso);
                  onSelectRange(start, end);
                }
              }}
              onMouseUp={() => {
                if (dragStart) {
                  const [start, end] = normalizeRange(dragStart, cell.iso);
                  onSelectRange(start, end);
                }
                setDragStart(null);
              }}
              onClick={() => onSelectRange(cell.iso, cell.iso)}
              className={cn(
                "aspect-square rounded-md text-xs transition",
                !cell.inMonth && "text-[var(--shell-text-muted)]/40",
                cell.inMonth && "text-[var(--shell-text)]",
                hasLeave && cell.inMonth && "bg-sky-500/25 font-semibold text-sky-600 dark:text-sky-300",
                selected && "ring-2 ring-sky-500 bg-sky-500/20",
                !selected && "hover:bg-[var(--shell-hover)]"
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-[var(--shell-text-muted)]">
        <span className="inline-block h-2 w-2 rounded bg-sky-500/40 align-middle mr-1" />
        Jour avec congé enregistré
      </p>
    </div>
  );
}
