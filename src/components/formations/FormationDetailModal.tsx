"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { AddParticipantModal } from "./AddParticipantModal";
import { EditParticipantModal } from "./EditParticipantModal";
import { Badge } from "@/components/ui/Badge";
import { readApiError, showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import { formationStatusBadgeClass, formationStatusLabel } from "@/lib/formations-utils";
import type { Employee, FormationParticipant, FormationRecord } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export function FormationDetailModal({
  formationId,
  employees,
  onClose,
  onUpdated,
}: {
  formationId: string;
  employees: Employee[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [formation, setFormation] = useState<FormationRecord | null>(null);
  const [participants, setParticipants] = useState<FormationParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<FormationParticipant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/formations/${formationId}`);
      if (!res.ok) throw new Error(await readApiError(res));
      const data = (await res.json()) as FormationRecord;
      setFormation(data);
      setParticipants(data.participants);
    } catch (e) {
      showErrorAlert(e instanceof Error ? e.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [formationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const existingIds = useMemo(
    () => new Set(participants.map((p) => p.employe_id)),
    [participants]
  );

  async function persistParticipants(next: FormationParticipant[], message?: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/formations/${formationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participation: next }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = (await res.json()) as FormationRecord;
      setFormation(data);
      setParticipants(data.participants);
      onUpdated();
      if (message) showSuccessAlert(message);
    } catch (e) {
      showErrorAlert(e instanceof Error ? e.message : "Erreur enregistrement");
    } finally {
      setSaving(false);
    }
  }

  function updateRowLocal(employeId: string, patch: Partial<FormationParticipant>) {
    setParticipants((list) =>
      list.map((p) => (p.employe_id === employeId ? { ...p, ...patch } : p))
    );
  }

  async function saveRow(employeId: string) {
    const row = participants.find((p) => p.employe_id === employeId);
    if (!row) return;
    await persistParticipants(
      participants.map((p) => (p.employe_id === employeId ? row : p)),
      "Participant mis à jour"
    );
  }

  async function saveAllParticipants() {
    await persistParticipants(participants, "Participants enregistrés");
  }

  async function removeParticipant(employeId: string) {
    await persistParticipants(
      participants.filter((p) => p.employe_id !== employeId),
      "Participant retiré"
    );
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--shell-border)] px-5 py-4">
          <div className="min-w-0">
            {loading ? (
              <h3 className="text-lg font-semibold">Chargement…</h3>
            ) : formation ? (
              <>
                <h3 className="truncate text-lg font-semibold">{formation.titre}</h3>
                <Badge className={cn("mt-1 text-[10px]", formationStatusBadgeClass(formation.status))}>
                  {formationStatusLabel(formation.status)}
                </Badge>
              </>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--shell-surface)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading || !formation ? (
          <div className="p-8 text-center text-sm text-[var(--shell-text-muted)]">Chargement…</div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="overflow-y-auto border-b border-[var(--shell-border)] p-5 lg:border-b-0 lg:border-r">
              <h4 className="mb-3 text-xs font-semibold uppercase text-[var(--shell-text-muted)]">Détails</h4>
              <dl className="space-y-3 text-sm">
                {[
                  ["Période", `${formatDate(formation.dateDebut)} – ${formatDate(formation.dateFin)}`],
                  ["Niveau", formation.niveau || "—"],
                  ["Instructeur", formation.instructeur || "—"],
                  ["Participants", String(formation.participantCount)],
                  ["Commentaire", formation.commentaire?.trim() || "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] uppercase text-[var(--shell-text-muted)]">{label}</dt>
                    <dd className="mt-0.5 text-[var(--shell-text)]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase text-[var(--shell-text-muted)]">Participants</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveAllParticipants()}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--shell-border)] px-3 py-1.5 text-xs hover:bg-[var(--shell-surface)] disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", saving && "animate-spin")} />
                    Tout enregistrer
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--shell-border)]">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="sticky top-0 bg-[var(--shell-surface)] text-[10px] uppercase text-[var(--shell-text-muted)]">
                    <tr>
                      <th className="px-3 py-2">Agent</th>
                      <th className="px-3 py-2">Département</th>
                      <th className="px-3 py-2 w-20">Cote</th>
                      <th className="px-3 py-2 w-24">Objectif</th>
                      <th className="px-3 py-2 w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[var(--shell-text-muted)]">
                          Aucun participant.
                        </td>
                      </tr>
                    ) : (
                      participants.map((p) => (
                        <tr key={p.employe_id} className="border-t border-[var(--shell-border)]/60">
                          <td className="px-3 py-2 font-medium">
                            {p.prenom} {p.nom}
                            <div className="text-[10px] text-[var(--shell-text-muted)]">{p.matricule}</div>
                          </td>
                          <td className="px-3 py-2">{p.departement}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              className="input w-full py-1 text-xs"
                              value={p.cote ?? ""}
                              onChange={(e) =>
                                updateRowLocal(p.employe_id, {
                                  cote: e.target.value === "" ? null : Number(e.target.value),
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step={1}
                              className="input w-full py-1 text-xs"
                              value={p.point_a_atteindre ?? ""}
                              onChange={(e) =>
                                updateRowLocal(p.employe_id, {
                                  point_a_atteindre:
                                    e.target.value === "" ? null : Math.trunc(Number(e.target.value)),
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                title="Modifier"
                                onClick={() => setEditTarget(p)}
                                className="rounded p-1 hover:bg-[var(--shell-surface)]"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Mettre à jour"
                                disabled={saving}
                                onClick={() => void saveRow(p.employe_id)}
                                className="rounded p-1 text-sky-400 hover:bg-[var(--shell-surface)] disabled:opacity-50"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Retirer"
                                onClick={() => void removeParticipant(p.employe_id)}
                                className="rounded p-1 text-red-400 hover:bg-[var(--shell-surface)]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <AddParticipantModal
          employees={employees}
          existingIds={existingIds}
          onAdd={(p) => {
            const next = [...participants, p];
            setParticipants(next);
            void persistParticipants(next, "Participant ajouté");
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editTarget && (
        <EditParticipantModal
          participant={editTarget}
          onSave={(updated) => {
            const next = participants.map((p) =>
              p.employe_id === updated.employe_id ? updated : p
            );
            setParticipants(next);
            void persistParticipants(next, "Participant modifié");
          }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
