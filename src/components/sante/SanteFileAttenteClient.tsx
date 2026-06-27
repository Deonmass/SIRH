"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Eye, Loader2, Pencil, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyTable, StickyThead, Td, Th } from "@/components/layout/StickyTable";
import { MultiFileAttachStrip } from "@/components/sante/MultiFileAttachStrip";
import { SanteFileAttenteAdvancedSearch } from "@/components/sante/SanteFileAttenteAdvancedSearch";
import { SanteMatriculeField } from "@/components/sante/SanteMatriculeField";
import { SanteVisiteDetailModal } from "@/components/sante/SanteVisiteDetailModal";
import { SanteVisiteRejectModal } from "@/components/sante/SanteVisiteRejectModal";
import { SanteVisiteStatutCell } from "@/components/sante/SanteVisiteStatutCell";
import { useContextMenu } from "@/components/ui/ContextMenu";
import { useAuth } from "@/contexts/AuthContext";
import { employeeDisplayName } from "@/lib/extra-costs";
import type { Hopital } from "@/lib/repositories/hopitaux";
import type { HopitalVisite } from "@/lib/repositories/hopital-visite";
import {
  filterSanteFileAttenteRows,
  getISOWeekNumber,
  type SanteFileAttenteAdvancedFilters,
} from "@/lib/sante-file-attente-filters";
import {
  SANTE_VISITE_VALIDATION_LABELS,
  getSanteVisiteStatut,
  parseSanteVisiteValidation,
  type SanteVisiteFichier,
  type SanteVisiteValidation,
} from "@/lib/sante-visite";
import { MOIS_FR_OPTIONS } from "@/lib/pointage-utils";
import type { Employee } from "@/lib/types";
import {
  readApiError,
  runDeleteWithSweetAlert,
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts";
import { cn, formatDate } from "@/lib/utils";

function formatMontant(value?: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function defaultAdvancedFilters(now: Date): SanteFileAttenteAdvancedFilters {
  return {
    active: false,
    mode: "interval",
    dateFrom: "",
    dateTo: "",
    weekYear: now.getFullYear(),
    week: getISOWeekNumber(now),
    quarterYear: now.getFullYear(),
    quarter: (Math.ceil((now.getMonth() + 1) / 3) as 1 | 2 | 3 | 4),
    semesterYear: now.getFullYear(),
    semester: now.getMonth() < 6 ? 1 : 2,
  };
}

async function uploadVisiteFiles(visiteId: string, files: File[]): Promise<SanteVisiteFichier[]> {
  const uploaded: SanteVisiteFichier[] = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append("visiteId", visiteId);
    formData.append("file", file);
    const res = await fetch("/api/sante/visites/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error(await readApiError(res));
    const data = await res.json();
    uploaded.push({
      name: data.name,
      ref: data.storageRef,
      size: data.size,
      mimeType: data.mimeType,
    });
  }
  return uploaded;
}

async function openVisiteFile(ref: string) {
  const res = await fetch(`/api/sante/visites/file?ref=${encodeURIComponent(ref)}`);
  if (!res.ok) throw new Error(await readApiError(res));
  const { url } = await res.json();
  window.open(url, "_blank", "noopener,noreferrer");
}

export function SanteFileAttenteClient() {
  const now = useMemo(() => new Date(), []);
  const { can } = useAuth();
  const canWrite = can("sante.file-attente", "write");
  const canDelete = can("sante.file-attente", "delete");
  const canValidate = can("sante.file-attente", "validate1");

  const [rows, setRows] = useState<HopitalVisite[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hopitaux, setHopitaux] = useState<Hopital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<HopitalVisite | null>(null);
  const [viewing, setViewing] = useState<HopitalVisite | null>(null);
  const [rejectTarget, setRejectTarget] = useState<HopitalVisite | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SanteFileAttenteAdvancedFilters>(() =>
    defaultAdvancedFilters(now)
  );
  const [form, setForm] = useState({
    matriculeAgent: "",
    hopital: "",
    dateVisite: "",
    motif: "",
    montant: "",
    validation: "en_attente" as SanteVisiteValidation,
    raisonRejet: "",
  });
  const { open, menuNode } = useContextMenu();

  const employeeByMatricule = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(e.matricule, e));
    return map;
  }, [employees]);

  const filteredRows = useMemo(
    () =>
      filterSanteFileAttenteRows(
        rows,
        { search, year: filterYear, month: filterMonth },
        advancedFilters,
        employeeByMatricule
      ),
    [rows, search, filterYear, filterMonth, advancedFilters, employeeByMatricule]
  );

  const years = useMemo(() => {
    const y = now.getFullYear();
    return Array.from({ length: 6 }, (_, i) => y - i);
  }, [now]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [visitesRes, hopitauxRes, employeesRes] = await Promise.all([
        fetch("/api/sante/visites"),
        fetch("/api/sante/hopitaux"),
        fetch("/api/employees"),
      ]);
      const data = await visitesRes.json();
      if (!visitesRes.ok) throw new Error(data.error ?? "Chargement impossible");
      setRows(data);
      if (hopitauxRes.ok) setHopitaux(await hopitauxRes.json());
      if (employeesRes.ok) setEmployees(await employeesRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit(row: HopitalVisite) {
    if (!canWrite) return;
    setEditing(row);
    setPendingFiles([]);
    setForm({
      matriculeAgent: row.matriculeAgent ?? "",
      hopital: row.hopital ?? "",
      dateVisite: row.dateVisite ?? "",
      motif: row.motif ?? "",
      montant: row.montant != null ? String(row.montant) : "",
      validation: getSanteVisiteStatut(row.validation),
      raisonRejet: parseSanteVisiteValidation(row.validation).raisonRejet ?? "",
    });
    setShowForm(true);
  }

  async function submitStatutChange(
    row: HopitalVisite,
    validationStatut: SanteVisiteValidation,
    raisonRejet?: string
  ) {
    if (!canValidate) return;
    setValidatingId(row.id);
    try {
      const res = await fetch("/api/sante/visites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...row,
          validationStatut,
          raisonRejet,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      await load();
    } catch (e) {
      await showErrorAlert(
        "Statut impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setValidatingId(null);
      setRejectTarget(null);
    }
  }

  function handleStatutChange(row: HopitalVisite, validationStatut: SanteVisiteValidation) {
    if (validationStatut === "rejete") {
      setRejectTarget(row);
      return;
    }
    void submitStatutChange(row, validationStatut);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      let fichiers = editing.fichiers ?? [];
      if (pendingFiles.length > 0) {
        const uploaded = await uploadVisiteFiles(editing.id, pendingFiles);
        fichiers = [...fichiers, ...uploaded];
      }

      const payload: HopitalVisite = {
        ...editing,
        matriculeAgent: form.matriculeAgent,
        hopital: form.hopital,
        dateVisite: form.dateVisite || undefined,
        motif: form.motif || undefined,
        montant: form.montant ? Number(form.montant) : undefined,
        fichiers,
      };
      if (canValidate && form.validation !== getSanteVisiteStatut(editing.validation)) {
        if (form.validation === "rejete" && !form.raisonRejet.trim()) {
          await showErrorAlert("Motif requis", "Indiquez la raison du rejet.");
          setSaving(false);
          return;
        }
        Object.assign(payload, {
          validationStatut: form.validation,
          raisonRejet: form.validation === "rejete" ? form.raisonRejet : undefined,
        });
      }

      const res = await fetch("/api/sante/visites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setShowForm(false);
      setEditing(null);
      setPendingFiles([]);
      await load();
      await showSuccessAlert("Visite modifiée", "Les informations ont été mises à jour.");
    } catch (e) {
      await showErrorAlert(
        "Modification impossible",
        e instanceof Error ? e.message : "Erreur"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: HopitalVisite) {
    if (!canDelete) return;
    const ok = await runDeleteWithSweetAlert(
      {
        title: "Supprimer cette visite ?",
        message: `Matricule ${row.matriculeAgent ?? "—"} — ${row.hopital ?? "sans hôpital"}`,
        successMessage: "La visite a été retirée de la file.",
      },
      () => fetch(`/api/sante/visites?id=${encodeURIComponent(row.id)}`, { method: "DELETE" })
    );
    if (ok) await load();
  }

  const hopitauxActifs = hopitaux.filter(
    (h) => (h.statut ?? "actif").toLowerCase() !== "inactif"
  );

  return (
    <div>
      {menuNode}
      <PageHeader
        title="File d'attente santé"
        description="Visites médicales enregistrées via le formulaire"
      >
        <div className="flex flex-wrap items-end justify-end gap-2">
          <label className="relative block min-w-[12rem] flex-1 text-sm sm:max-w-[16rem]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher agent, hôpital…"
              className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] py-2 pl-8 pr-8 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                aria-label="Effacer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Année</span>
            <select
              value={filterYear}
              onChange={(e) => {
                setFilterYear(Number(e.target.value));
                setAdvancedFilters((f) => ({ ...f, active: false }));
              }}
              className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2.5 py-2 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-[10px] text-[var(--shell-text-muted)]">Mois</span>
            <select
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value === "" ? "" : Number(e.target.value));
                setAdvancedFilters((f) => ({ ...f, active: false }));
              }}
              className="min-w-[7.5rem] rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2.5 py-2 text-sm"
            >
              <option value="">Tous</option>
              {MOIS_FR_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setShowAdvanced(true)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition",
              advancedFilters.active
                ? "border-sky-500/50 bg-sky-500/10 text-sky-400"
                : "border-[var(--shell-border)] hover:bg-[var(--shell-hover)]"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Avancée
          </button>
        </div>
      </PageHeader>

      {advancedFilters.active && (
        <p className="mb-3 text-xs text-sky-400">
          Filtre avancé actif —{" "}
          {advancedFilters.mode === "interval" && "intervalle de dates"}
          {advancedFilters.mode === "week" && `semaine ${advancedFilters.week} (${advancedFilters.weekYear})`}
          {advancedFilters.mode === "quarter" && `T${advancedFilters.quarter} ${advancedFilters.quarterYear}`}
          {advancedFilters.mode === "semester" && `S${advancedFilters.semester} ${advancedFilters.semesterYear}`}
          <button
            type="button"
            onClick={() => setAdvancedFilters((f) => ({ ...f, active: false }))}
            className="ml-2 underline hover:text-sky-300"
          >
            Désactiver
          </button>
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : (
        <StickyTable>
          <StickyThead>
            <tr>
              <Th className="w-12">N°</Th>
              <Th>Agent</Th>
              <Th>Hôpital</Th>
              <Th>Date visite</Th>
              <Th className="text-right">Montant</Th>
              <Th>Fichiers</Th>
              <Th>Statut</Th>
              <Th className="w-32 text-right">Actions</Th>
            </tr>
          </StickyThead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <Td colSpan={8} className="py-12 text-center text-[var(--shell-text-muted)]">
                  {rows.length === 0
                    ? "Aucune visite en file d'attente."
                    : "Aucun résultat pour ces filtres."}
                </Td>
              </tr>
            ) : (
              filteredRows.map((row, index) => {
                const employee = row.matriculeAgent
                  ? employeeByMatricule.get(row.matriculeAgent)
                  : undefined;
                const menuItems = [
                  {
                    id: "view",
                    label: "Visualiser",
                    icon: <Eye className="h-3.5 w-3.5" />,
                    onClick: () => setViewing(row),
                  },
                  ...(canWrite
                    ? [
                        {
                          id: "edit",
                          label: "Éditer",
                          icon: <Pencil className="h-3.5 w-3.5" />,
                          onClick: () => openEdit(row),
                        },
                      ]
                    : []),
                  ...(canDelete
                    ? [
                        {
                          id: "delete",
                          label: "Supprimer",
                          icon: <Trash2 className="h-3.5 w-3.5" />,
                          danger: true,
                          onClick: () => void handleDelete(row),
                        },
                      ]
                    : []),
                ];

                return (
                  <tr
                    key={row.id}
                    className="cursor-context-menu hover:bg-[var(--shell-hover)]"
                    onContextMenu={(e) => open(e, menuItems)}
                  >
                    <Td className="tabular-nums text-[var(--shell-text-muted)]">{index + 1}</Td>
                    <Td>
                      <div className="min-w-[8rem]">
                        <p className="text-sm font-medium leading-tight text-[var(--shell-text)]">
                          {employee ? employeeDisplayName(employee) : "—"}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-[var(--shell-text-muted)]">
                          {row.matriculeAgent ?? "—"}
                        </p>
                      </div>
                    </Td>
                    <Td className="font-medium">{row.hopital ?? "—"}</Td>
                    <Td>{row.dateVisite ? formatDate(row.dateVisite) : "—"}</Td>
                    <Td className="text-right tabular-nums">{formatMontant(row.montant)}</Td>
                    <Td>
                      {(row.fichiers ?? []).length === 0 ? (
                        <span className="text-[var(--shell-text-muted)]">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(row.fichiers ?? []).map((f) => (
                            <button
                              key={f.ref}
                              type="button"
                              onClick={() =>
                                void openVisiteFile(f.ref).catch((err) =>
                                  showErrorAlert("Fichier", err instanceof Error ? err.message : "Erreur")
                                )
                              }
                              className="inline-flex items-center gap-0.5 rounded border border-[var(--shell-border)] px-1.5 py-0.5 text-[10px] text-sky-500 hover:bg-[var(--shell-hover)]"
                              title={f.name}
                            >
                              <ExternalLink className="h-3 w-3" />
                              {f.name.length > 12 ? `${f.name.slice(0, 10)}…` : f.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <SanteVisiteStatutCell
                        validation={row.validation}
                        disabled={!canValidate || validatingId === row.id}
                        onChange={
                          canValidate
                            ? (statut) => handleStatutChange(row, statut)
                            : undefined
                        }
                      />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewing(row)}
                          className="rounded p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-sky-500"
                          title="Visualiser"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="rounded p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-sky-500"
                            title="Éditer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => void handleDelete(row)}
                            className="rounded p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-red-400"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </StickyTable>
      )}

      <SanteFileAttenteAdvancedSearch
        open={showAdvanced}
        filters={advancedFilters}
        onChange={(patch) => setAdvancedFilters((f) => ({ ...f, ...patch }))}
        onClose={() => setShowAdvanced(false)}
        onApply={() => {
          setAdvancedFilters((f) => ({ ...f, active: true }));
          setShowAdvanced(false);
        }}
        onReset={() => {
          setAdvancedFilters(defaultAdvancedFilters(now));
          setShowAdvanced(false);
        }}
      />

      <SanteVisiteRejectModal
        open={Boolean(rejectTarget)}
        agentLabel={
          rejectTarget?.matriculeAgent
            ? `${employeeByMatricule.get(rejectTarget.matriculeAgent) ? employeeDisplayName(employeeByMatricule.get(rejectTarget.matriculeAgent)!) : "Agent"} — ${rejectTarget.matriculeAgent}`
            : "Visite médicale"
        }
        saving={validatingId === rejectTarget?.id}
        onClose={() => setRejectTarget(null)}
        onConfirm={(raison) => {
          if (rejectTarget) void submitStatutChange(rejectTarget, "rejete", raison);
        }}
      />

      {viewing && (
        <SanteVisiteDetailModal
          visite={viewing}
          employee={
            viewing.matriculeAgent
              ? employeeByMatricule.get(viewing.matriculeAgent)
              : undefined
          }
          onClose={() => setViewing(null)}
          onOpenFile={(ref) =>
            void openVisiteFile(ref).catch((err) =>
              showErrorAlert("Fichier", err instanceof Error ? err.message : "Erreur")
            )
          }
        />
      )}

      {showForm && editing && canWrite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold">Modifier la visite</h3>
            <div className="mt-4 space-y-3">
              <SanteMatriculeField
                value={form.matriculeAgent}
                onChange={(matriculeAgent) => setForm((f) => ({ ...f, matriculeAgent }))}
                disabled={saving}
              />

              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Hôpital</span>
                {hopitauxActifs.length > 0 ? (
                  <select
                    value={form.hopital}
                    onChange={(e) => setForm((f) => ({ ...f, hopital: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                  >
                    <option value="">— Sélectionner —</option>
                    {hopitauxActifs.map((h) => (
                      <option key={h.id} value={h.hopital}>
                        {h.hopital}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.hopital}
                    onChange={(e) => setForm((f) => ({ ...f, hopital: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                  />
                )}
              </label>

              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Date visite</span>
                <input
                  type="date"
                  value={form.dateVisite}
                  onChange={(e) => setForm((f) => ({ ...f, dateVisite: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>

              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Motif</span>
                <textarea
                  value={form.motif}
                  onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>

              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Montant</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.montant}
                  onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>

              {canValidate && (
                <>
                  <label className="block text-sm">
                    <span className="text-[var(--shell-text-muted)]">Statut</span>
                    <select
                      value={form.validation}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          validation: e.target.value as SanteVisiteValidation,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                    >
                      {(Object.keys(SANTE_VISITE_VALIDATION_LABELS) as SanteVisiteValidation[]).map(
                        (key) => (
                          <option key={key} value={key}>
                            {SANTE_VISITE_VALIDATION_LABELS[key]}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  {form.validation === "rejete" && (
                    <label className="block text-sm">
                      <span className="text-[var(--shell-text-muted)]">Motif du rejet *</span>
                      <textarea
                        value={form.raisonRejet}
                        onChange={(e) => setForm((f) => ({ ...f, raisonRejet: e.target.value }))}
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                      />
                    </label>
                  )}
                </>
              )}

              {(editing.fichiers ?? []).length > 0 && (
                <div className="text-sm">
                  <span className="text-[var(--shell-text-muted)]">Fichiers existants</span>
                  <ul className="mt-1 space-y-1">
                    {(editing.fichiers ?? []).map((f) => (
                      <li key={f.ref}>
                        <button
                          type="button"
                          onClick={() =>
                            void openVisiteFile(f.ref).catch((err) =>
                              showErrorAlert("Fichier", err instanceof Error ? err.message : "Erreur")
                            )
                          }
                          className="text-xs text-sky-500 hover:underline"
                        >
                          {f.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <MultiFileAttachStrip
                files={pendingFiles}
                onAdd={(files) => setPendingFiles((prev) => [...prev, ...files])}
                onRemove={(index) => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
                disabled={saving}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setPendingFiles([]);
                }}
                className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
