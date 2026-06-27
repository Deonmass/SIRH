"use client";

import { Plus, Trash2 } from "lucide-react";
import { newNamedOrgRef } from "@/lib/employee-kind";
import type { NamedOrgRef } from "@/lib/types";

export function NamedOrgRefEditor({
  title,
  description,
  items,
  onChange,
  addLabel,
}: {
  title: string;
  description: string;
  items: NamedOrgRef[];
  onChange: (items: NamedOrgRef[]) => void;
  addLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-5">
      <h3 className="font-semibold text-[var(--shell-text)]">{title}</h3>
      <p className="mt-1 text-xs text-[var(--shell-text-muted)]">{description}</p>
      <ul className="mt-4 space-y-2">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-3"
          >
            <input
              value={item.name}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, name: e.target.value };
                onChange(next);
              }}
              placeholder="Nom"
              className="input min-w-[10rem] flex-1"
            />
            <input
              value={item.code ?? ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, code: e.target.value };
                onChange(next);
              }}
              placeholder="Code"
              className="input w-28"
            />
            <label className="flex items-center gap-1.5 text-xs text-[var(--shell-text-muted)]">
              <input
                type="checkbox"
                checked={item.active}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...item, active: e.target.checked };
                  onChange(next);
                }}
              />
              Actif
            </label>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...items, newNamedOrgRef(addLabel)])}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--shell-border)] px-3 py-2 text-xs font-medium text-[var(--shell-text)] hover:bg-[var(--shell-hover)]"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter
      </button>
    </div>
  );
}
