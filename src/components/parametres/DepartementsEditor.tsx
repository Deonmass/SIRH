"use client";

import { useCallback, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Grid8, GridStat } from "@/components/ui/Grid8";
import { useAppSettings } from "@/contexts/SettingsContext";
import { readApiError } from "@/lib/alerts";
import { departementLabels, suggestUniqueLibelle } from "@/lib/repositories/departements/mapper";
import type { Departement } from "@/lib/types";

export function DepartementsEditor({ initial }: { initial: Departement[] }) {
  const { settings, commitSettings } = useAppSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [items, setItems] = useState(initial);
  const itemsRef = useRef(initial);
  itemsRef.current = items;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const syncSettings = useCallback(
    (nextItems: Departement[]) => {
      commitSettings({
        ...settingsRef.current,
        departments: departementLabels(nextItems, true),
      });
    },
    [commitSettings]
  );

  function applyItems(next: Departement[]) {
    itemsRef.current = next;
    setItems(next);
    syncSettings(next);
  }

  async function handleCreate() {
    setError("");
    setBusyId("new");
    const existingLibelles = new Set(
      itemsRef.current.map((d) => d.libelle.trim().toLowerCase())
    );
    const libelle = suggestUniqueLibelle("Nouveau département", existingLibelles);
    const res = await fetch("/api/departements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        libelle,
        ordre: itemsRef.current.length + 1,
      }),
    });
    setBusyId(null);
    if (!res.ok) {
      setError(await readApiError(res));
      return;
    }
    const created = (await res.json()) as Departement;
    applyItems([...itemsRef.current, created].sort(sortDepartements));
  }

  async function handleUpdate(item: Departement) {
    setError("");
    setBusyId(item.id);
    const res = await fetch(`/api/departements/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    setBusyId(null);
    if (!res.ok) {
      setError(await readApiError(res));
      return;
    }
    const saved = (await res.json()) as Departement;
    applyItems(
      itemsRef.current.map((d) => (d.id === saved.id ? saved : d)).sort(sortDepartements)
    );
  }

  async function handleDelete(id: string) {
    setError("");
    setBusyId(id);
    const res = await fetch(`/api/departements/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      setError(await readApiError(res));
      return;
    }
    applyItems(itemsRef.current.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <Grid8>
        {items.map((item) => (
          <GridStat key={item.id}>
            <label className="block text-[10px] text-[var(--shell-text-muted)]">Code</label>
            <input
              value={item.code}
              disabled={busyId === item.id}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((d) => (d.id === item.id ? { ...d, code: e.target.value.toUpperCase() } : d))
                )
              }
              onBlur={(e) => void handleUpdate({ ...item, code: e.target.value.toUpperCase() })}
              className="input mb-2 text-sm uppercase"
            />
            <label className="block text-[10px] text-[var(--shell-text-muted)]">Libellé</label>
            <input
              value={item.libelle}
              disabled={busyId === item.id}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((d) => (d.id === item.id ? { ...d, libelle: e.target.value } : d))
                )
              }
              onBlur={(e) => void handleUpdate({ ...item, libelle: e.target.value })}
              className="input text-sm"
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-[var(--shell-text-muted)]">
              <input
                type="checkbox"
                checked={item.actif}
                disabled={busyId === item.id}
                onChange={(e) => {
                  const next = { ...item, actif: e.target.checked };
                  setItems((prev) => prev.map((d) => (d.id === item.id ? next : d)));
                  void handleUpdate(next);
                }}
              />
              Actif
            </label>
            <button
              type="button"
              disabled={busyId === item.id}
              onClick={() => void handleDelete(item.id)}
              className="mt-2 text-red-400 text-xs flex items-center gap-1 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" /> Suppr.
            </button>
          </GridStat>
        ))}
      </Grid8>
      <button
        type="button"
        disabled={busyId === "new"}
        onClick={() => void handleCreate()}
        className="inline-flex items-center gap-1 text-sm text-sky-400 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Ajouter département
      </button>
    </div>
  );
}

function sortDepartements(a: Departement, b: Departement) {
  return a.ordre - b.ordre || a.libelle.localeCompare(b.libelle, "fr");
}
