"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DropdownRect = { top: number; left: number; width: number };

export function SuggestTextField({
  value,
  onChange,
  suggestions,
  placeholder,
  required,
  disabled,
  className,
  inputClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);
  const [mounted, setMounted] = useState(false);

  const filtered = useMemo(() => {
    const needle = value.trim().toLowerCase();
    const base = suggestions.filter(Boolean);
    const list = needle
      ? base.filter((s) => s.toLowerCase().includes(needle))
      : base;
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, "fr")).slice(0, 20);
  }, [suggestions, value]);

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
    if (!open) return;
    updateDropdownRect();
    const onScroll = () => updateDropdownRect();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, value]);

  function select(item: string) {
    onChange(item);
    setOpen(false);
    setHighlight(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && filtered[highlight]) {
      e.preventDefault();
      select(filtered[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const dropdown =
    open &&
    filtered.length > 0 &&
    dropdownRect &&
    mounted &&
    createPortal(
      <ul
        id={listboxId}
        role="listbox"
        className="z-[200] max-h-56 overflow-auto rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] py-1 shadow-lg"
        style={{
          position: "fixed",
          top: dropdownRect.top,
          left: dropdownRect.left,
          width: dropdownRect.width,
        }}
      >
        {filtered.map((item, idx) => (
          <li key={item} role="option" aria-selected={idx === highlight}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(item)}
              onMouseEnter={() => setHighlight(idx)}
              className={cn(
                "block w-full px-3 py-2 text-left text-sm",
                idx === highlight
                  ? "bg-sky-500/15 text-[var(--shell-text)]"
                  : "text-[var(--shell-text)] hover:bg-[var(--shell-hover)]"
              )}
            >
              {item}
            </button>
          </li>
        ))}
      </ul>,
      document.body
    );

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => {
          setOpen(true);
          setHighlight(0);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2",
          inputClassName
        )}
      />
      {dropdown}
    </div>
  );
}
