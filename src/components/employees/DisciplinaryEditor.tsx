"use client";

import { useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  createDisciplinaryRecord,
  DISCIPLINARY_TYPE_CONFIG,
  getDisciplinarySummary,
  syncEmployeeDisciplinaryState,
} from "@/lib/disciplinary";
import type { DisciplinaryRecord, DisciplinaryType, Employee } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const ESCALATION_STYLES = {
  none: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  watch: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  formal: "bg-orange-500/10 text-orange-300 border-orange-500/30",
  critical: "bg-red-500/10 text-red-300 border-red-500/30",
};

export function DisciplinaryEditor({
  employee,
  onSave,
  variant = "full",
}: {
  employee: Employee;
  onSave: (data: Pick<Employee, "disciplinaryRecords" | "warningsCount" | "status">) => void;
  /** formOnly : formulaire à gauche sans liste historique */
  variant?: "full" | "formOnly";
}) {
  const records = employee.disciplinaryRecords ?? [];
  const summary = getDisciplinarySummary(records);
  const formOnly = variant === "formOnly";
  const [showForm, setShowForm] = useState(formOnly);
  const [form, setForm] = useState({
    type: "written_warning" as DisciplinaryType,
    date: new Date().toISOString().slice(0, 10),
    effectiveDate: "",
    endDate: "",
    reason: "",
    facts: "",
    issuedBy: "",
    legalBasis: "",
  });

  function persist(nextRecords: DisciplinaryRecord[]) {
    const synced = syncEmployeeDisciplinaryState(employee, nextRecords);
    onSave(synced);
  }

  function addRecord() {
    if (!form.reason.trim() || !form.facts.trim()) return;
    const config = DISCIPLINARY_TYPE_CONFIG[form.type];
    const record = createDisciplinaryRecord({
      type: form.type,
      date: form.date,
      effectiveDate: form.effectiveDate || form.date,
      endDate: form.type === "suspension" ? form.endDate || undefined : undefined,
      reason: form.reason.trim(),
      facts: form.facts.trim(),
      issuedBy: form.issuedBy.trim() || undefined,
      legalBasis: form.legalBasis.trim() || config.legalRef,
      acknowledged: false,
      status: "open",
    });
    persist([record, ...records]);
    if (!formOnly) setShowForm(false);
    setForm({
      type: "written_warning",
      date: new Date().toISOString().slice(0, 10),
      effectiveDate: "",
      endDate: "",
      reason: "",
      facts: "",
      issuedBy: "",
      legalBasis: "",
    });
  }

  function removeRecord(id: string) {
    persist(records.filter((r) => r.id !== id));
  }

  function updateStatus(id: string, status: DisciplinaryRecord["status"]) {
    persist(
      records.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              acknowledged: status === "closed" ? true : r.acknowledged,
              acknowledgedAt:
                status === "closed" && !r.acknowledgedAt
                  ? new Date().toISOString()
                  : r.acknowledgedAt,
            }
          : r
      )
    );
  }

  const formBlock = (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-[var(--shell-text-muted)]">
          Type de sanction
          <select
            value={form.type}
            onChange={(e) => {
              const type = e.target.value as DisciplinaryType;
              const cfg = DISCIPLINARY_TYPE_CONFIG[type];
              setForm((f) => ({
                ...f,
                type,
                legalBasis: cfg.legalRef,
              }));
            }}
            className="input mt-1 w-full"
          >
            {Object.entries(DISCIPLINARY_TYPE_CONFIG).map(([k, cfg]) => (
              <option key={k} value={k}>
                {cfg.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--shell-text-muted)]">
          Date de l&apos;incident
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="input mt-1 w-full"
          />
        </label>
        <label className="text-xs text-[var(--shell-text-muted)]">
          Date d&apos;effet
          <input
            type="date"
            value={form.effectiveDate}
            onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
            className="input mt-1 w-full"
          />
        </label>
        {form.type === "suspension" && (
          <label className="text-xs text-[var(--shell-text-muted)]">
            Fin de mise à pied
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className="input mt-1 w-full"
            />
          </label>
        )}
        <label className="text-xs text-[var(--shell-text-muted)] sm:col-span-2">
          Motif (résumé)
          <input
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            className="input mt-1 w-full"
            placeholder="Ex. retards répétés, non-respect consignes sécurité"
          />
        </label>
        <label className="text-xs text-[var(--shell-text-muted)] sm:col-span-2">
          Faits établis
          <textarea
            value={form.facts}
            onChange={(e) => setForm((f) => ({ ...f, facts: e.target.value }))}
            rows={3}
            className="input mt-1 w-full"
            placeholder="Description objective, témoins, dates…"
          />
        </label>
        <label className="text-xs text-[var(--shell-text-muted)]">
          Émis par
          <input
            value={form.issuedBy}
            onChange={(e) => setForm((f) => ({ ...f, issuedBy: e.target.value }))}
            className="input mt-1 w-full"
          />
        </label>
        <label className="text-xs text-[var(--shell-text-muted)]">
          Base légale
          <input
            value={form.legalBasis}
            onChange={(e) => setForm((f) => ({ ...f, legalBasis: e.target.value }))}
            className="input mt-1 w-full"
          />
        </label>
      </div>
      <div className={cn("flex gap-2", formOnly && "flex-col")}>
        <button
          type="button"
          onClick={addRecord}
          disabled={!form.reason.trim() || !form.facts.trim()}
          className={cn(
            "rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50",
            formOnly ? "w-full" : ""
          )}
        >
          Enregistrer
        </button>
        {!formOnly && (
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );

  if (formOnly) {
    return (
      <div className="space-y-4">
        <Card className={cn("border", ESCALATION_STYLES[summary.escalationLevel])}>
          <CardContent className="flex gap-3 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-xs text-[var(--shell-text-muted)]">
              {summary.escalationLevel === "none"
                ? "Niveau : RAS"
                : summary.escalationLevel === "watch"
                  ? "Surveillance"
                  : summary.escalationLevel === "formal"
                    ? "Procédure formelle"
                    : "Critique"}
              {summary.warnings > 0 && ` · ${summary.warnings} avertissement(s)`}
            </p>
          </CardContent>
        </Card>
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase text-[var(--shell-text-muted)]">
            Nouvelle mesure
          </h4>
          {formBlock}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Mesures au dossier" value={String(summary.total)} />
        <Stat label="Avertissements" value={String(summary.warnings)} accent={summary.warnings > 0} />
        <Stat label="Dossiers ouverts" value={String(summary.openCount)} />
        <Stat
          label="Jours mise à pied (année)"
          value={`${summary.suspensionDaysUsed} / 30`}
          accent={summary.suspensionDaysUsed >= 30}
        />
      </div>

      <Card className={cn("border", ESCALATION_STYLES[summary.escalationLevel])}>
        <CardContent className="flex gap-3 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">
              Niveau :{" "}
              {summary.escalationLevel === "none"
                ? "RAS"
                : summary.escalationLevel === "watch"
                  ? "Surveillance"
                  : summary.escalationLevel === "formal"
                    ? "Procédure formelle"
                    : "Critique"}
            </p>
            {summary.activeSuspension && (
              <p className="mt-1">
                Mise à pied en cours jusqu&apos;au{" "}
                {summary.activeSuspension.endDate
                  ? formatDate(summary.activeSuspension.endDate)
                  : "—"}
              </p>
            )}
            {summary.recommendation && (
              <p className="mt-2 text-slate-300">{summary.recommendation}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Gestion disciplinaire</h2>
              <p className="text-sm text-slate-400">
                Art. 54 — échelle des sanctions · traçabilité · lien avec le dossier pièces
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              <Plus className="h-4 w-4" />
              Nouvelle mesure
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">{formBlock}</div>
          )}

          {records.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune mesure disciplinaire enregistrée.</p>
          ) : (
            <div className="space-y-3">
              {records.map((r) => {
                const cfg = DISCIPLINARY_TYPE_CONFIG[r.type];
                return (
                  <div
                    key={r.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{cfg.label}</p>
                          <Badge className="bg-white/5 text-slate-400 border-white/10 text-[10px]">
                            {r.status}
                          </Badge>
                          {cfg.countsAsWarning && (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                              Avertissement
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-300">{r.reason}</p>
                        <p className="mt-2 text-xs text-slate-500">{r.facts}</p>
                        <p className="mt-2 text-xs text-sky-400/80">{r.legalBasis ?? cfg.legalRef}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatDate(r.date)}
                          {r.effectiveDate && r.effectiveDate !== r.date
                            ? ` · effet ${formatDate(r.effectiveDate)}`
                            : ""}
                          {r.endDate ? ` → ${formatDate(r.endDate)}` : ""}
                          {r.issuedBy ? ` · ${r.issuedBy}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <select
                          value={r.status}
                          onChange={(e) =>
                            updateStatus(r.id, e.target.value as DisciplinaryRecord["status"])
                          }
                          className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
                        >
                          <option value="open">Ouvert</option>
                          <option value="closed">Clôturé</option>
                          <option value="appealed">Contesté</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeRecord(r.id)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3" /> Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-slate-600 border-t border-white/10 pt-3">
            Joignez la convocation et le PV dans l&apos;onglet « Dossier & pièces » (convocation
            disciplinaire, procès-verbal).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-slate-400">{label}</p>
        <p className={cn("mt-1 text-xl font-bold", accent ? "text-amber-400" : "text-white")}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
