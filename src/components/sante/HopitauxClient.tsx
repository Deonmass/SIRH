"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyTable, StickyThead, Td, Th } from "@/components/layout/StickyTable";
import { Badge } from "@/components/ui/Badge";
import { useContextMenu } from "@/components/ui/ContextMenu";
import type { Hopital } from "@/lib/repositories/hopitaux";
import {
  readApiError,
  runDeleteWithSweetAlert,
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type HopitalStatut = "actif" | "inactif";

const STATUT_OPTIONS: { value: HopitalStatut; label: string }[] = [
  { value: "actif", label: "Actif" },
  { value: "inactif", label: "Inactif" },
];

function statutLabel(statut?: string): string {
  const normalized = (statut ?? "actif").toLowerCase();
  return normalized === "inactif" ? "Inactif" : "Actif";
}

function statutBadgeClass(statut?: string): string {
  return (statut ?? "actif").toLowerCase() === "inactif"
    ? "bg-slate-500/20 text-slate-400"
    : "bg-emerald-500/20 text-emerald-600";
}

const emptyForm = {
  hopital: "",
  dateDebutContrat: "",
  statut: "actif" as HopitalStatut,
};

export function HopitauxClient() {
  const [rows, setRows] = useState<Hopital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Hopital | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { open, menuNode } = useContextMenu();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sante/hopitaux");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chargement impossible");
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(row: Hopital) {
    setEditing(row);
    setForm({
      hopital: row.hopital,
      dateDebutContrat: row.dateDebutContrat ?? "",
      statut: (row.statut?.toLowerCase() === "inactif" ? "inactif" : "actif") as HopitalStatut,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        hopital: form.hopital,
        dateDebutContrat: form.dateDebutContrat || undefined,
        statut: form.statut,
      };
      const res = await fetch("/api/sante/hopitaux", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...payload, id: editing.id } : payload),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
      await showSuccessAlert(
        editing ? "Hôpital modifié" : "Hôpital enregistré",
        editing
          ? "Les informations ont été mises à jour."
          : "L'hôpital affilié a été ajouté avec succès."
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur";
      setError(message);
      await showErrorAlert("Enregistrement impossible", message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Hopital) {
    const ok = await runDeleteWithSweetAlert(
      {
        title: "Supprimer cet hôpital ?",
        message: `« ${row.hopital} » sera retiré de la liste.`,
        successMessage: "L'hôpital a été supprimé.",
      },
      () => fetch(`/api/sante/hopitaux?id=${encodeURIComponent(row.id)}`, { method: "DELETE" })
    );
    if (ok) await load();
  }

  return (
    <div>
      {menuNode}
      <PageHeader
        title="Hôpitaux affiliés"
        description="Liste des hôpitaux partenaires et contrats santé"
      >
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </PageHeader>

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
              <Th className="w-16">N°</Th>
              <Th>Hôpital</Th>
              <Th>Date début contrat</Th>
              <Th>Statut</Th>
            </tr>
          </StickyThead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={4} className="py-12 text-center text-[var(--shell-text-muted)]">
                  Aucun hôpital enregistré.
                </Td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="cursor-context-menu hover:bg-[var(--shell-hover)]"
                  onContextMenu={(e) =>
                    open(e, [
                      {
                        id: "edit",
                        label: "Éditer",
                        icon: <Pencil className="h-3.5 w-3.5" />,
                        onClick: () => openEdit(row),
                      },
                      {
                        id: "delete",
                        label: "Supprimer",
                        icon: <Trash2 className="h-3.5 w-3.5" />,
                        danger: true,
                        onClick: () => void handleDelete(row),
                      },
                    ])
                  }
                >
                  <Td className="tabular-nums text-[var(--shell-text-muted)]">{index + 1}</Td>
                  <Td className="font-medium">{row.hopital}</Td>
                  <Td>{row.dateDebutContrat ? formatDate(row.dateDebutContrat) : "—"}</Td>
                  <Td>
                    <Badge className={cn("text-[10px]", statutBadgeClass(row.statut))}>
                      {statutLabel(row.statut)}
                    </Badge>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </StickyTable>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-[var(--shell-text)]">
              {editing ? "Modifier l'hôpital" : "Nouvel hôpital"}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Hôpital *</span>
                <input
                  required
                  value={form.hopital}
                  onChange={(e) => setForm((f) => ({ ...f, hopital: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Date début contrat</span>
                <input
                  type="date"
                  value={form.dateDebutContrat}
                  onChange={(e) => setForm((f) => ({ ...f, dateDebutContrat: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Statut</span>
                <select
                  value={form.statut}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, statut: e.target.value as HopitalStatut }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                >
                  {STATUT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
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
