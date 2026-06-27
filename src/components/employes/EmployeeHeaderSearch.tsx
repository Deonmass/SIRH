"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function EmployeeHeaderSearch({
  query,
  open,
  onOpenChange,
  onQueryChange,
}: {
  query: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hasQuery = Boolean(query.trim());

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open, onOpenChange]);

  function clearSearch() {
    onQueryChange("");
    inputRef.current?.focus();
  }

  return (
    <div ref={wrapRef} className="flex items-center">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "relative p-1 text-[var(--shell-text-muted)] transition-all duration-500",
          "hover:scale-110 hover:text-sky-400",
          (open || hasQuery) && "text-sky-400"
        )}
        aria-label={open ? "Fermer la recherche" : "Rechercher un employé"}
        aria-expanded={open}
      >
        <SearchIcon
          className={cn(
            "h-5 w-5 transition-all duration-500",
            open && "rotate-12 scale-110"
          )}
        />
        {hasQuery && !open && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
        )}
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-columns] duration-500 ease-out",
          open ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <label
            className={cn(
              "relative ml-1 flex min-w-[13rem] items-center transition-all duration-500 ease-out md:min-w-[18rem]",
              open
                ? "pointer-events-auto translate-x-0 opacity-100"
                : "pointer-events-none -translate-x-3 opacity-0"
            )}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Nom, matricule, département…"
              className={cn(
                "input w-full border-sky-500/30 py-2 pl-3 pr-9 text-sm",
                "shadow-[0_0_0_0_rgba(56,189,248,0)] transition-shadow duration-500",
                open && "shadow-[0_0_20px_-4px_rgba(56,189,248,0.35)]"
              )}
              aria-label="Rechercher un employé"
            />
            {hasQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className={cn(
                  "absolute right-1.5 rounded-md p-1 text-[var(--shell-text-muted)]",
                  "transition-colors duration-200 hover:bg-[var(--shell-surface)] hover:text-[var(--shell-text)]"
                )}
                aria-label="Effacer la recherche"
              >
                <ClearIcon className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>
      </div>
    </div>
  );
}
