"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import type { Employee } from "@/lib/types";
import { employeeDisplayName } from "@/lib/extra-costs";
import { cn } from "@/lib/utils";

function matchesEmployee(employee: Employee, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = `${employee.matricule} ${employee.prenom} ${employee.nom} ${employee.department ?? ""}`.toLowerCase();
  return needle.split(/\s+/).every((t) => haystack.includes(t));
}

function formatOption(employee: Employee): string {
  return `${employee.matricule} — ${employeeDisplayName(employee)}`;
}

type DropdownRect = { top: number; left: number; width: number };

export function MatriculeEmployeeField({
  employees,
  value,
  onChange,
  disabled = false,
  label = "Lier à un employé (matricule)",
  dropdownClassName,
}: {
  employees: Employee[];
  value: string;
  onChange: (matricule: string) => void;
  disabled?: boolean;
  label?: string;
  /** Classes appliquées à la liste déroulante (portail). */
  dropdownClassName?: string;
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
    () => employees.find((e) => e.matricule === value) ?? null,
    [employees, value]
  );

  const filtered = useMemo(
    () => employees.filter((e) => matchesEmployee(e, query)).slice(0, 12),
    [employees, query]
  );

  useEffect(() => setMounted(true), []);

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

  function pick(employee: Employee) {
    onChange(employee.matricule);
    setQuery(formatOption(employee));
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
    } else if (!next.trim()) {
      onChange("");
    }
  }

  const dropdown =
    mounted && open && !disabled && dropdownRect && filtered.length > 0
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
          >
            <ul
              id={listboxId}
              role="listbox"
              className={cn(
                "max-h-56 overflow-y-auto rounded-xl border border-[var(--shell-border)] py-1 shadow-2xl",
                dropdownClassName ?? "bg-[var(--shell-card)]"
              )}
            >
              {filtered.map((employee, index) => (
                <li key={employee.id} role="option" aria-selected={index === highlight}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(employee)}
                    className={cn(
                      "flex w-full flex-col px-3 py-2 text-left text-sm transition",
                      index === highlight
                        ? "bg-sky-600/15 text-sky-700 dark:text-sky-300"
                        : "hover:bg-[var(--shell-hover)]"
                    )}
                  >
                    <span className="font-mono text-xs font-semibold">{employee.matricule}</span>
                    <span className="text-[var(--shell-text)]">{employeeDisplayName(employee)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={wrapperRef} className="relative">
      <span className="text-xs text-[var(--shell-text-muted)]">{label}</span>
      <div className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setOpen(true);
            updateDropdownRect();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) => (h + 1) % Math.max(filtered.length, 1));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setHighlight(
                (h) => (h - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1)
              );
              return;
            }
            if (e.key === "Enter" && open && filtered.length > 0) {
              e.preventDefault();
              pick(filtered[highlight] ?? filtered[0]!);
              return;
            }
            if (e.key === "Escape") {
              setOpen(false);
              setQuery(selected ? formatOption(selected) : "");
            }
          }}
          placeholder="Rechercher par matricule ou nom…"
          className="input w-full pl-9 pr-9"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
            aria-label="Effacer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {dropdown}
    </div>
  );
}
