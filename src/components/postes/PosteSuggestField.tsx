"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  employeesOnPosition,
  formatRemainingSlotsLabel,
  occupiedCount,
  plannedHeadcount,
  remainingSlots,
} from "@/lib/poste-headcount";
import { statusLabel } from "@/lib/postes";
import type { Employee, JobPosition, JobPositionStatus } from "@/lib/types";
import { employeeDisplayName } from "@/lib/extra-costs";
import { cn } from "@/lib/utils";

function positionStatusBadgeClass(status: JobPositionStatus) {
  switch (status) {
    case "vacant":
      return "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300";
    case "active":
      return "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-300";
    case "draft":
      return "bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-300";
    default:
      return "bg-[var(--shell-surface)] text-[var(--shell-text-muted)] border-[var(--shell-border)]";
  }
}

function formatOption(p: JobPosition) {
  return `${p.title} · ${p.department}`;
}

function positionOccupants(p: JobPosition, employees: Employee[]): Employee[] {
  const linked = employeesOnPosition(p.id, employees);
  if (linked.length > 0) return linked;
  return p.employeeId ? employees.filter((e) => e.id === p.employeeId) : [];
}

function matchesQuery(p: JobPosition, query: string, employees: Employee[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const occupants = positionOccupants(p, employees);
  const remaining = formatRemainingSlotsLabel(remainingSlots(p, employees));
  const haystack = `${p.title} ${p.department} ${p.code} ${statusLabel(p.status)} ${remaining} ${occupants.map(employeeDisplayName).join(" ")}`.toLowerCase();
  const tokens = needle.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

type DropdownRect = { top: number; left: number; width: number };

export function PosteSuggestField({
  options,
  value,
  onChange,
  employees,
  disabled = false,
  placeholder = "Rechercher un poste…",
}: {
  options: JobPosition[];
  value: string;
  onChange: (id: string) => void;
  employees: Employee[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);
  const [mounted, setMounted] = useState(false);

  const selected = useMemo(
    () => options.find((p) => p.id === value) ?? null,
    [options, value]
  );

  const suggestions = useMemo(
    () =>
      options
        .filter((p) => matchesQuery(p, query, employees))
        .sort((a, b) => a.title.localeCompare(b.title, "fr"))
        .slice(0, 15),
    [options, query, employees]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateDropdownRect = () => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setDropdownRect(null);
      return;
    }
    updateDropdownRect();
    window.addEventListener("scroll", updateDropdownRect, true);
    window.addEventListener("resize", updateDropdownRect);
    return () => {
      window.removeEventListener("scroll", updateDropdownRect, true);
      window.removeEventListener("resize", updateDropdownRect);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) {
      setQuery(selected ? formatOption(selected) : "");
    }
  }, [selected, open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      const portal = document.getElementById(`${listboxId}-portal`);
      if (portal?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [listboxId]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  function select(id: string) {
    onChange(id);
    const next = options.find((p) => p.id === id);
    setQuery(next ? formatOption(next) : "");
    setOpen(false);
    inputRef.current?.blur();
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  function handleInputChange(next: string) {
    setQuery(next);
    setOpen(true);
    if (value) {
      const label = selected ? formatOption(selected) : "";
      if (next !== label) onChange("");
    }
  }

  function handleFocus() {
    setOpen(true);
    updateDropdownRect();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h + 1) % Math.max(suggestions.length, 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h - 1 + Math.max(suggestions.length, 1)) % Math.max(suggestions.length, 1));
      return;
    }
    if (e.key === "Enter" && open && suggestions.length > 0) {
      e.preventDefault();
      select(suggestions[highlight]?.id ?? suggestions[0].id);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setQuery(selected ? formatOption(selected) : "");
    }
  }

  const dropdown =
    mounted && open && !disabled && dropdownRect
      ? createPortal(
          <div
            id={`${listboxId}-portal`}
            style={{
              position: "fixed",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
          >
            <ul
              id={listboxId}
              role="listbox"
              className="max-h-52 overflow-y-auto bg-[var(--shell-bg)] py-1"
            >
            {suggestions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--shell-text-muted)]">Aucune suggestion</li>
            ) : (
              suggestions.map((p, idx) => {
                const occupants = positionOccupants(p, employees);
                const remaining = remainingSlots(p, employees);
                const planned = plannedHeadcount(p);
                const occupied = occupiedCount(p, employees);
                const remainingLabel = formatRemainingSlotsLabel(remaining);
                return (
                  <li key={p.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === p.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => select(p.id)}
                      className={cn(
                        "w-full bg-[var(--shell-bg)] px-3 py-2 text-left text-sm",
                        highlight === idx
                          ? "bg-[var(--shell-hover)] text-[var(--shell-text)] ring-1 ring-inset ring-sky-500/40"
                          : "hover:bg-[var(--shell-hover)]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--shell-text)]">{p.title}</p>
                          <p className="truncate text-xs text-[var(--shell-text-muted)]">
                            {p.department}
                            {planned > 1
                              ? ` · ${occupied}/${planned} affecté(s)`
                              : occupants[0]
                                ? ` · ${employeeDisplayName(occupants[0])}`
                                : ""}
                            {remainingLabel ? ` · ${remainingLabel}` : ""}
                          </p>
                        </div>
                        <Badge className={cn("shrink-0 text-[10px]", positionStatusBadgeClass(p.status))}>
                          {remaining > 0 ? remainingLabel || statusLabel(p.status) : statusLabel(p.status)}
                        </Badge>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input w-full pr-9"
          autoComplete="off"
          disabled={disabled}
        />
        {(value || query) && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
            aria-label="Effacer le poste"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {dropdown}
    </div>
  );
}
