"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  ENTRETIEN_TYPE_OPTIONS,
  type EntretienSuiviRow,
} from "@/lib/charroi-entretien";
import { readApiError, showErrorAlert } from "@/lib/alerts";
import { cn } from "@/lib/utils";

export function CharroiEntretienRecordModal({
  target,
  canWrite,
  onClose,
  onSaved,
}: {
  target: EntretienSuiviRow;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    types: ["Révision / vidange"] as string[],
    kmOdometre: target.kmActuel != null ? String(target.kmActuel) : "",
    cout: "",
    prestataire: "",
    notes: "",
    intervalleKm: String(target.intervalleKm),
    alerteAvantKm: String(target.alerteAvantKm),
  });

  function toggleType(type: string, checked: boolean) {
    setForm((f) => {
      const next = checked
        ? [...f.types, type]
        : f.types.filter((t) => t !== type);
      return { ...f, types: next };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    if (form.types.length === 0) {
      await showErrorAlert("Type requis", "Sélectionnez au moins un type d'entretien.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/charroi/entretien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_entretien",
          vehiculeId: target.vehiculeId,
          date: form.date,
          types: form.types,
          kmOdometre: form.kmOdometre ? Number(form.kmOdometre) : undefined,
          kmParcourusDepuis: target.kmDepuisEntretien,
          cout: form.cout ? Number(form.cout) : undefined,
          prestataire: form.prestataire || undefined,
          notes: form.notes || undefined,
          intervalleKm: form.intervalleKm ? Number(form.intervalleKm) : undefined,
          alerteAvantKm: form.alerteAvantKm ? Number(form.alerteAvantKm) : undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      await onSaved();
    } catch (e) {
      await showErrorAlert(
        "Enregistrement impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Enregistrer un entretien</h3>
            <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
              {target.plaque} — {target.marque}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <fieldset className="block text-sm sm:col-span-2">
            <legend className="text-[var(--shell-text-muted)]">Types *</legend>
            <div className="mt-2 grid gap-2 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-3 sm:grid-cols-2">
              {ENTRETIEN_TYPE_OPTIONS.map((opt) => {
                const checked = form.types.includes(opt);
                return (
                  <label
                    key={opt}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
                      checked && "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleType(opt, e.target.checked)}
                      className="rounded border-[var(--shell-border)]"
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
            {form.types.length === 0 && (
              <p className="mt-1 text-[10px] text-amber-500">
                Sélectionnez au moins un type.
              </p>
            )}
          </fieldset>
          <label className="block text-sm">
            <span className="text-[var(--shell-text-muted)]">Date de l&apos;entretien *</span>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--shell-text-muted)]">Km compteur *</span>
            <input
              type="number"
              required
              min={0}
              value={form.kmOdometre}
              onChange={(e) => setForm((f) => ({ ...f, kmOdometre: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--shell-text-muted)]">Coût ($)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.cout}
              onChange={(e) => setForm((f) => ({ ...f, cout: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--shell-text-muted)]">Prestataire</span>
            <input
              value={form.prestataire}
              onChange={(e) => setForm((f) => ({ ...f, prestataire: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-[var(--shell-text-muted)]">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--shell-text-muted)]">Intervalle (km)</span>
            <input
              type="number"
              min={1000}
              step={500}
              value={form.intervalleKm}
              onChange={(e) => setForm((f) => ({ ...f, intervalleKm: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--shell-text-muted)]">Alerte avant (km)</span>
            <input
              type="number"
              min={0}
              step={100}
              value={form.alerteAvantKm}
              onChange={(e) => setForm((f) => ({ ...f, alerteAvantKm: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || form.types.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
