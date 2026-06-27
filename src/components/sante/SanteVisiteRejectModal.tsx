"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

export function SanteVisiteRejectModal({
  open,
  agentLabel,
  onClose,
  onConfirm,
  saving = false,
}: {
  open: boolean;
  agentLabel: string;
  onClose: () => void;
  onConfirm: (raison: string) => void;
  saving?: boolean;
}) {
  const [raison, setRaison] = useState("");

  useEffect(() => {
    if (open) setRaison("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-red-400">Rejeter la visite</h3>
            <p className="mt-1 text-sm text-[var(--shell-text-muted)]">{agentLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-[var(--shell-text-muted)]">Motif du rejet *</span>
          <textarea
            value={raison}
            onChange={(e) => setRaison(e.target.value)}
            rows={4}
            placeholder="Indiquez la raison du rejet…"
            className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
            autoFocus
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={saving || !raison.trim()}
            onClick={() => onConfirm(raison.trim())}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmer le rejet
          </button>
        </div>
      </div>
    </div>
  );
}
