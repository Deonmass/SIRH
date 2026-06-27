"use client";

import { useEffect, useRef, useState } from "react";
import { CircleDollarSign, Pencil, Plus, Trash2, X } from "lucide-react";
import { runDeleteWithSweetAlert } from "@/lib/alerts";
import {
  centreDesCoutsLabel,
  newCentreDesCouts,
} from "@/lib/centre-des-couts-utils";
import { SaveButton } from "@/components/ui/SaveButton";
import type { CentreDesCouts } from "@/lib/types";
import { cn } from "@/lib/utils";

type FormState = {
  denommination: string;
  autreInfo: string;
  text: string;
};

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; item: CentreDesCouts };

function emptyForm(): FormState {
  return { denommination: "", autreInfo: "", text: "" };
}

function formFromItem(item: CentreDesCouts): FormState {
  return {
    denommination: item.denommination,
    autreInfo: item.autreInfo,
    text: item.text,
  };
}

export function CentresCoutsEditor({
  items,
  onChange,
}: {
  items: CentreDesCouts[];
  onChange: (items: CentreDesCouts[]) => void;
}) {
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  function applyItems(next: CentreDesCouts[]) {
    onChange(next);
  }

  function openCreate() {
    setError("");
    setForm(emptyForm());
    setModal({ mode: "create" });
  }

  function openEdit(item: CentreDesCouts) {
    setError("");
    setForm(formFromItem(item));
    setModal({ mode: "edit", item });
  }

  function closeModal() {
    setModal(null);
    setForm(emptyForm());
  }

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  function handleSave() {
    if (!modal) return;
    const denommination = form.denommination.trim();
    if (!denommination) {
      setError("La dénomination est obligatoire.");
      return;
    }

    setError("");
    const payload = {
      denommination,
      autreInfo: form.autreInfo.trim(),
      text: form.text.trim(),
    };

    if (modal.mode === "create") {
      const created = { ...newCentreDesCouts(itemsRef.current), ...payload };
      applyItems([...itemsRef.current, created]);
    } else {
      const saved: CentreDesCouts = { ...modal.item, ...payload };
      applyItems(itemsRef.current.map((row) => (row.id === saved.id ? saved : row)));
    }
    closeModal();
  }

  async function handleDelete(item: CentreDesCouts) {
    const label = centreDesCoutsLabel(item);
    const ok = await runDeleteWithSweetAlert(
      {
        title: "Supprimer ce centre de coûts ?",
        message: `« ${label} » sera retiré du référentiel.`,
        progressMessage: "Suppression…",
        successTitle: "Centre supprimé",
        successMessage: `« ${label} » a été retiré.`,
      },
      async () => new Response(null, { status: 200 })
    );
    if (ok) {
      applyItems(itemsRef.current.filter((row) => row.id !== item.id));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--shell-text-muted)]">
          {items.length} centre(s) de coûts — modifications enregistrées via le bouton
          « Enregistrer »
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {error && !modal && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--shell-border)] py-12 text-center">
          <CircleDollarSign className="mx-auto h-8 w-8 text-[var(--shell-text-muted)] opacity-50" />
          <p className="mt-2 text-sm text-[var(--shell-text-muted)]">Aucun centre de coûts.</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-3 text-sm text-sky-400 hover:underline"
          >
            Créer le premier centre
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-4 transition hover:border-sky-500/30"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                  <CircleDollarSign className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm text-[var(--shell-text)] truncate">
                    {centreDesCoutsLabel(item)}
                  </h3>
                  <p className="text-[10px] font-mono text-[var(--shell-text-muted)]">#{item.id}</p>
                </div>
              </div>

              {item.autreInfo ? (
                <p className="mt-3 text-xs text-[var(--shell-text-muted)] line-clamp-2">
                  <span className="font-medium text-[var(--shell-text)]">Info :</span>{" "}
                  {item.autreInfo}
                </p>
              ) : null}

              {item.text ? (
                <p className="mt-2 text-xs text-[var(--shell-text-muted)] line-clamp-3 whitespace-pre-wrap">
                  {item.text}
                </p>
              ) : null}

              {!item.autreInfo && !item.text ? (
                <p className="mt-3 text-xs italic text-[var(--shell-text-muted)]">
                  Aucune information complémentaire
                </p>
              ) : null}

              <div className="mt-auto flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--shell-border)] px-2 py-1.5 text-xs font-medium text-[var(--shell-text)] hover:bg-[var(--shell-hover)]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(item)}
                  className="inline-flex items-center justify-center rounded-lg border border-red-500/30 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="centre-couts-modal-title"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--shell-border)] px-5 py-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                  <CircleDollarSign className="h-4 w-4" />
                </div>
                <h3
                  id="centre-couts-modal-title"
                  className="font-semibold text-sm text-[var(--shell-text)] truncate"
                >
                  {modal.mode === "create" ? "Nouveau centre de coûts" : "Modifier le centre"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </p>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--shell-text-muted)]">
                  Dénomination *
                </span>
                <input
                  value={form.denommination}
                  onChange={(e) => setForm((f) => ({ ...f, denommination: e.target.value }))}
                  className="input w-full text-sm"
                  placeholder="Ex. Production, Administration…"
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--shell-text-muted)]">
                  Autre info
                </span>
                <input
                  value={form.autreInfo}
                  onChange={(e) => setForm((f) => ({ ...f, autreInfo: e.target.value }))}
                  className="input w-full text-sm"
                  placeholder="Code analytique, service…"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--shell-text-muted)]">
                  Texte
                </span>
                <textarea
                  rows={3}
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                  className={cn("input w-full text-sm resize-none")}
                  placeholder="Notes ou description…"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--shell-border)] px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
              >
                Annuler
              </button>
              <SaveButton
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Valider
              </SaveButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
