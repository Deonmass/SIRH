"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PanelCard } from "../DossierDataViews";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  currentMoisAnnee,
  formatMoisAnneeLabel,
  totalOvertimeHours,
} from "@/lib/employes-overtime-json";
import { computeOvertimeMonthlyImpact } from "@/lib/overtime-monthly";
import { readApiError, runWithLoadingAlert, showErrorAlert } from "@/lib/alerts";
import { resolveWorkMonthMode } from "@/lib/work-month-mode";
import type {
  AppSettings,
  Employee,
  JobPositionPayroll,
  OvertimeMonthlyRecord,
  WorkMonthMode,
} from "@/lib/types";
import { useAppSettings } from "@/contexts/SettingsContext";

type FormState = {
  moisAnnee: string;
  hours130: number;
  hours160: number;
  hours200: number;
  workMonthMode: WorkMonthMode;
  notes: string;
};

function emptyForm(settings: AppSettings, employee: Employee): FormState {
  return {
    moisAnnee: currentMoisAnnee(),
    hours130: 0,
    hours160: 0,
    hours200: 0,
    workMonthMode: resolveWorkMonthMode(employee, settings),
    notes: "",
  };
}

export function DossierHeuresSupPanel({
  employee,
  settings,
  positionPayroll,
  records: initialRecords,
  onRecordsChange,
}: {
  employee: Employee;
  settings: AppSettings;
  positionPayroll?: JobPositionPayroll | null;
  records?: OvertimeMonthlyRecord[];
  onRecordsChange?: (records: OvertimeMonthlyRecord[]) => void;
}) {
  const { formatSalary } = useAppSettings();
  const [records, setRecords] = useState<OvertimeMonthlyRecord[]>(
    initialRecords ?? employee.overtimeMonthlyRecords ?? []
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(settings, employee));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRecords(initialRecords ?? employee.overtimeMonthlyRecords ?? []);
  }, [employee.id, employee.overtimeMonthlyRecords, initialRecords]);

  const draftRecord: OvertimeMonthlyRecord = useMemo(
    () => ({
      id: editingId ?? "draft",
      moisAnnee: form.moisAnnee,
      hours130: form.hours130,
      hours160: form.hours160,
      hours200: form.hours200,
      workMonthMode: form.workMonthMode,
      notes: form.notes.trim() || undefined,
      createdAt: "",
      updatedAt: "",
    }),
    [editingId, form]
  );

  const impact = useMemo(() => {
    if (totalOvertimeHours(draftRecord) <= 0) return null;
    return computeOvertimeMonthlyImpact({
      employee,
      record: draftRecord,
      settings,
      positionPayroll: positionPayroll ?? null,
    });
  }, [draftRecord, employee, settings, positionPayroll]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(settings, employee));
  }

  function startEdit(record: OvertimeMonthlyRecord) {
    setEditingId(record.id);
    setForm({
      moisAnnee: record.moisAnnee,
      hours130: record.hours130,
      hours160: record.hours160,
      hours200: record.hours200,
      workMonthMode: record.workMonthMode ?? resolveWorkMonthMode(employee, settings),
      notes: record.notes ?? "",
    });
  }

  async function persist(body: Partial<OvertimeMonthlyRecord> & { id?: string }) {
    setBusy(true);
    try {
      await runWithLoadingAlert(async () => {
        const url = body.id
          ? `/api/employees/${encodeURIComponent(employee.id)}/overtime/${encodeURIComponent(body.id)}`
          : `/api/employees/${encodeURIComponent(employee.id)}/overtime`;
        const res = await fetch(url, {
          method: body.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as {
          records?: OvertimeMonthlyRecord[];
          error?: string;
        };
        if (!res.ok || !data.records) {
          await showErrorAlert(
            "Enregistrement impossible",
            data.error ?? (await readApiError(res))
          );
          return;
        }
        setRecords(data.records);
        onRecordsChange?.(data.records);
        resetForm();
      }, "Enregistrement…", "Mise à jour des heures supplémentaires.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(recordId: string) {
    setBusy(true);
    try {
      await runWithLoadingAlert(async () => {
        const res = await fetch(
          `/api/employees/${encodeURIComponent(employee.id)}/overtime/${encodeURIComponent(recordId)}`,
          { method: "DELETE" }
        );
        const data = (await res.json()) as {
          records?: OvertimeMonthlyRecord[];
          error?: string;
        };
        if (!res.ok || !data.records) {
          await showErrorAlert(
            "Suppression impossible",
            data.error ?? (await readApiError(res))
          );
          return;
        }
        setRecords(data.records);
        onRecordsChange?.(data.records);
        if (editingId === recordId) resetForm();
      }, "Suppression…", "Retrait des heures supplémentaires.");
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (totalOvertimeHours(draftRecord) <= 0) {
      void showErrorAlert("Saisie requise", "Indiquez au moins une heure supplémentaire.");
      return;
    }
    void persist({
      id: editingId ?? undefined,
      moisAnnee: form.moisAnnee,
      hours130: form.hours130,
      hours160: form.hours160,
      hours200: form.hours200,
      workMonthMode: form.workMonthMode,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6" aria-busy={busy}>
      <p className="text-sm text-[var(--shell-text-muted)]">
        Heures prestées hors temps normal, regroupées par mois. Le montant calculé est intégré à la
        paie imposable du mois concerné (clôture paie / bulletin).
      </p>

      <div className="grid gap-6 xl:grid-cols-2">
        <PanelCard title={editingId ? "Modifier le mois" : "Nouveau mois"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-xs text-[var(--shell-text-muted)]">
              Mois concerné
              <input
                type="month"
                value={form.moisAnnee}
                onChange={(e) => setForm((f) => ({ ...f, moisAnnee: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="block text-xs text-[var(--shell-text-muted)]">
              Régime de travail
              <select
                value={form.workMonthMode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    workMonthMode: Number(e.target.value) as WorkMonthMode,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm"
              >
                <option value={26}>26 j / mois</option>
                <option value={22}>22 j / mois</option>
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-[var(--shell-text-muted)]">
                HS 130 %
                <NumericInput
                  min={0}
                  decimal
                  value={form.hours130}
                  onChange={(n) => setForm((f) => ({ ...f, hours130: n }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--shell-text-muted)]">
                HS 160 %
                <NumericInput
                  min={0}
                  decimal
                  value={form.hours160}
                  onChange={(n) => setForm((f) => ({ ...f, hours160: n }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--shell-text-muted)]">
                HS 200 %
                <NumericInput
                  min={0}
                  decimal
                  value={form.hours200}
                  onChange={(n) => setForm((f) => ({ ...f, hours200: n }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block text-xs text-[var(--shell-text-muted)]">
              Notes (optionnel)
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {editingId ? "Mettre à jour" : "Enregistrer le mois"}
              </button>
              {editingId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={resetForm}
                  className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm text-[var(--shell-text-muted)]"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </PanelCard>

        <PanelCard title="Impact sur la paie du mois">
          {impact ? (
            <div className="space-y-3 text-sm">
              <p className="text-[var(--shell-text-muted)]">
                {formatMoisAnneeLabel(impact.moisAnnee)} · régime {impact.workMonthMode} j
              </p>
              <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)]/60 p-3 font-mono text-xs">
                <p>
                  Base mensuelle : {formatSalary(impact.monthlyBase, impact.currency)} ÷{" "}
                  {impact.legalHours} h = {formatSalary(impact.hourlyRate, impact.currency)}/h
                </p>
                <p className="mt-2">
                  130 % : {impact.hours130} h · 160 % : {impact.hours160} h · 200 % :{" "}
                  {impact.hours200} h
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--shell-border)] pt-3">
                <span className="font-medium text-[var(--shell-text)]">
                  Total HS imposable ({impact.totalHours} h)
                </span>
                <span className="text-lg font-bold text-sky-500">
                  {formatSalary(impact.overtimePay, impact.currency)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--shell-text-muted)]">
              Saisissez des heures pour prévisualiser l&apos;impact sur le salaire du mois.
            </p>
          )}
        </PanelCard>
      </div>

      <PanelCard title="Historique mensuel">
        {records.length === 0 ? (
          <p className="text-sm text-[var(--shell-text-muted)]">
            Aucune heure supplémentaire enregistrée.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--shell-border)] text-xs text-[var(--shell-text-muted)]">
                  <th className="py-2 pr-3">Mois</th>
                  <th className="py-2 pr-3">130 %</th>
                  <th className="py-2 pr-3">160 %</th>
                  <th className="py-2 pr-3">200 %</th>
                  <th className="py-2 pr-3">Total h</th>
                  <th className="py-2 pr-3">Impact paie</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const rowImpact = computeOvertimeMonthlyImpact({
                    employee,
                    record,
                    settings,
                    positionPayroll: positionPayroll ?? null,
                  });
                  return (
                    <tr
                      key={record.id}
                      className="border-b border-[var(--shell-border)]/60 last:border-0"
                    >
                      <td className="py-2 pr-3 font-medium">
                        {formatMoisAnneeLabel(record.moisAnnee)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{record.hours130}</td>
                      <td className="py-2 pr-3 tabular-nums">{record.hours160}</td>
                      <td className="py-2 pr-3 tabular-nums">{record.hours200}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {totalOvertimeHours(record)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-sky-500">
                        {formatSalary(rowImpact.overtimePay, rowImpact.currency)}
                      </td>
                      <td className="py-2 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => startEdit(record)}
                            className="rounded p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                            aria-label="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void remove(record.id)}
                            className="rounded p-1.5 text-rose-400 hover:bg-rose-500/10"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
