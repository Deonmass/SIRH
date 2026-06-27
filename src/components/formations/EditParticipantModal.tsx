"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { SaveButton } from "@/components/ui/SaveButton";
import type { FormationParticipant } from "@/lib/types";

export function EditParticipantModal({
  participant,
  onSave,
  onClose,
}: {
  participant: FormationParticipant;
  onSave: (updated: FormationParticipant) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({ ...participant });
  const [saving, setSaving] = useState(false);

  function submit() {
    setSaving(true);
    onSave({
      ...draft,
      cote: draft.cote === null || draft.cote === undefined || Number.isNaN(Number(draft.cote))
        ? null
        : Number(draft.cote),
      point_a_atteindre:
        draft.point_a_atteindre === null ||
        draft.point_a_atteindre === undefined ||
        Number.isNaN(Number(draft.point_a_atteindre))
          ? null
          : Math.trunc(Number(draft.point_a_atteindre)),
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h4 className="font-semibold">Modifier le participant</h4>
            <p className="text-sm text-[var(--shell-text-muted)]">
              {draft.prenom} {draft.nom}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--shell-surface)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-[var(--shell-text-muted)]">Département</span>
            <input
              className="input w-full"
              value={draft.departement}
              onChange={(e) => setDraft((d) => ({ ...d, departement: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[var(--shell-text-muted)]">Cote</span>
            <input
              type="number"
              className="input w-full"
              value={draft.cote ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  cote: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[var(--shell-text-muted)]">Point à atteindre</span>
            <input
              type="number"
              step={1}
              className="input w-full"
              value={draft.point_a_atteindre ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  point_a_atteindre: e.target.value === "" ? null : Math.trunc(Number(e.target.value)),
                }))
              }
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--shell-border)] px-3 py-2 text-sm">
            Annuler
          </button>
          <SaveButton
            saving={saving}
            onClick={submit}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500"
          >
            Enregistrer
          </SaveButton>
        </div>
      </div>
    </div>
  );
}
