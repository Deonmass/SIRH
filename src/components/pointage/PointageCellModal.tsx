"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { SaveButton } from "@/components/ui/SaveButton";
import {
  applyPointageTimeRules,
  POINTAGE_JOUR_STATUTS,
  POINTAGE_STANDARD_END,
  POINTAGE_STANDARD_START,
  statutBadgeClass,
} from "@/lib/pointage-utils";
import type { DbPointageJourJson, DbPointageJourStatut } from "../../../database/migrations/019_pointage_table.types";
import { cn, formatDate } from "@/lib/utils";

const NEEDS_TIMES: DbPointageJourStatut[] = ["present", "retard", "mission"];

export function PointageCellModal({
  employeLabel,
  jour,
  verrouille,
  readOnly = false,
  onSave,
  onClose,
}: {
  employeLabel: string;
  jour: DbPointageJourJson;
  verrouille: boolean;
  readOnly?: boolean;
  onSave: (updated: DbPointageJourJson) => void | Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<DbPointageJourJson>({ ...jour });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({ ...jour });
  }, [jour]);

  const computed = useMemo(() => applyPointageTimeRules(draft), [draft]);
  const showTimes = NEEDS_TIMES.includes(draft.statut);

  function patch(partial: Partial<DbPointageJourJson>) {
    setDraft((prev) => applyPointageTimeRules({ ...prev, ...partial }));
  }

  async function submit() {
    setSaving(true);
    try {
      await onSave(applyPointageTimeRules(draft));
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h4 className="font-semibold">Pointage du jour</h4>
            <p className="text-sm text-[var(--shell-text-muted)]">
              {employeLabel} — {formatDate(draft.date)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--shell-surface)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {verrouille ? (
          <p className="text-sm text-emerald-500">Feuille clôturée — modification impossible.</p>
        ) : readOnly ? (
          <p className="text-sm text-amber-400/90">Consultation seule — modification non autorisée.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="mb-1 block text-[var(--shell-text-muted)]">Statut</span>
              <select
                className={cn("input w-full", statutBadgeClass(draft.statut))}
                value={draft.statut}
                onChange={(e) => patch({ statut: e.target.value as DbPointageJourStatut })}
              >
                {POINTAGE_JOUR_STATUTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            {showTimes && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[var(--shell-text-muted)]">Arrivée</span>
                  <input
                    type="time"
                    className="input w-full"
                    value={draft.heure_arrivee ?? ""}
                    onChange={(e) => patch({ heure_arrivee: e.target.value || null })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[var(--shell-text-muted)]">Départ</span>
                  <input
                    type="time"
                    className="input w-full"
                    value={draft.heure_depart ?? ""}
                    onChange={(e) => patch({ heure_depart: e.target.value || null })}
                  />
                </label>
              </div>
            )}

            {(draft.statut === "present" || draft.statut === "retard") && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)]/50 p-3 text-xs">
                <div>
                  <p className="text-[var(--shell-text-muted)]">Retard (min)</p>
                  <p className="font-semibold tabular-nums">{computed.minutes_retard ?? 0}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--shell-text-muted)]">
                    Réf. {POINTAGE_STANDARD_START}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--shell-text-muted)]">Heures sup. (h)</p>
                  <p className="font-semibold tabular-nums">{computed.heures_sup ?? 0}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--shell-text-muted)]">
                    Après {POINTAGE_STANDARD_END} ou 8 h
                  </p>
                </div>
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-[var(--shell-text-muted)]">Commentaire</span>
              <textarea
                className="input min-h-[72px] w-full"
                value={draft.commentaire ?? ""}
                onChange={(e) => patch({ commentaire: e.target.value || null })}
              />
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm hover:bg-[var(--shell-surface)]"
              >
                Annuler
              </button>
              <SaveButton
                saving={saving}
                onClick={() => void submit()}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500"
              >
                Enregistrer
              </SaveButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
