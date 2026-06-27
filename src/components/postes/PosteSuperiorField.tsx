"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { JobPosition } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatOption(p: JobPosition) {
  return `${p.title} — ${p.grade}`;
}

function matchesQuery(p: JobPosition, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    p.title.toLowerCase().includes(needle) ||
    p.grade.toLowerCase().includes(needle) ||
    p.code.toLowerCase().includes(needle)
  );
}

export function PosteSuperiorField({
  options,
  value,
  onChange,
  emptyHint,
}: {
  options: JobPosition[];
  value: string | null;
  onChange: (id: string | null) => void;
  emptyHint?: string;
}) {
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(
    () => options.find((p) => p.id === value) ?? null,
    [options, value]
  );

  const suggestions = useMemo(
    () => options.filter((p) => matchesQuery(p, query)).slice(0, 15),
    [options, query]
  );

  const showClear = Boolean(value || query);

  useEffect(() => {
    if (!open) {
      setQuery(selected ? formatOption(selected) : "");
    }
  }, [selected, open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  function select(id: string | null) {
    onChange(id);
    const next = id ? options.find((p) => p.id === id) : null;
    setQuery(next ? formatOption(next) : "");
    setOpen(false);
    inputRef.current?.blur();
  }

  function clear() {
    select(null);
    setQuery("");
    inputRef.current?.focus();
  }

  function handleInputChange(next: string) {
    setQuery(next);
    setOpen(true);
    if (value) {
      const label = selected ? formatOption(selected) : "";
      if (next !== label) onChange(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const itemCount = suggestions.length + 1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h + 1) % itemCount);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h - 1 + itemCount) % itemCount);
      return;
    }
    if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      if (highlight === 0) select(null);
      else select(suggestions[highlight - 1]?.id ?? null);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setQuery(selected ? formatOption(selected) : "");
    }
  }

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
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher par intitulé, grade ou code…"
          className="input w-full pr-9"
          autoComplete="off"
        />
        {showClear && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
            aria-label="Effacer le supérieur hiérarchique"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] py-1 shadow-lg"
        >
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(null)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm",
                highlight === 0
                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                  : "text-[var(--shell-text-muted)] hover:bg-white/5"
              )}
            >
              — Aucun (niveau racine) —
            </button>
          </li>
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--shell-text-muted)]">
              Aucune suggestion
            </li>
          ) : (
            suggestions.map((p, idx) => {
              const optionIndex = idx + 1;
              return (
                <li key={p.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === p.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(p.id)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm",
                      highlight === optionIndex
                        ? "bg-sky-500/15 text-[var(--shell-text)]"
                        : "text-[var(--shell-text)] hover:bg-white/5"
                    )}
                  >
                    <span className="font-medium">{p.title}</span>
                    <span className="text-[var(--shell-text-muted)]"> — {p.grade}</span>
                    {p.code && (
                      <span className="mt-0.5 block text-[10px] text-[var(--shell-text-muted)]">
                        {p.code}
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}

      {options.length === 0 && emptyHint && (
        <p className="mt-1 text-[10px] text-[var(--shell-text-muted)]">{emptyHint}</p>
      )}
    </div>
  );
}
