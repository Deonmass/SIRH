"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { StickyTable, StickyThead, Td, Th } from "@/components/layout/StickyTable";
import { TypeCoursDetailModal } from "@/components/charroi/TypeCoursDetailModal";
import { useContextMenu } from "@/components/ui/ContextMenu";
import { useAuth } from "@/contexts/AuthContext";
import type { TypeCours } from "@/lib/repositories/type-cours";
import {
  readApiError,
  runDeleteWithSweetAlert,
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts";
import { formatDate } from "@/lib/utils";

const emptyForm = { designation: "" };

function filterTypeCours(rows: TypeCours[], search: string): TypeCours[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => row.designation.toLowerCase().includes(q));
}

export function CharroiTypesCoursePanel({
  onTypesChange,
}: {
  onTypesChange?: (types: TypeCours[]) => void;
}) {
  const { can } = useAuth();
  const canWrite = can("charroi.types-course", "write");
  const canDelete = can("charroi.types-course", "delete");

  const [rows, setRows] = useState<TypeCours[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<TypeCours | null>(null);
  const [viewing, setViewing] = useState<TypeCours | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const { open, menuNode } = useContextMenu();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/charroi/types-course");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chargement impossible");
      setRows(data);
      onTypesChange?.(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [onTypesChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => filterTypeCours(rows, search), [rows, search]);

  function openCreate() {
    if (!canWrite) return;
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(row: TypeCours) {
    if (!canWrite) return;
    setEditing(row);
    setForm({ designation: row.designation });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { designation: form.designation.trim() };
      const res = await fetch("/api/charroi/types-course", {
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
        editing ? "Type modifié" : "Type enregistré",
        editing
          ? "La désignation a été mise à jour."
          : "Le type de course a été ajouté au référentiel."
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur";
      setError(message);
      await showErrorAlert("Enregistrement impossible", message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: TypeCours) {
    if (!canDelete) return;
    const ok = await runDeleteWithSweetAlert(
      {
        title: "Supprimer ce type de course ?",
        message: `« ${row.designation} » sera retiré du référentiel.`,
        successMessage: "Le type de course a été supprimé.",
      },
      () => fetch(`/api/charroi/types-course?id=${encodeURIComponent(row.id)}`, { method: "DELETE" })
    );
    if (ok) await load();
  }

  return (
    <div>
      {menuNode}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <p className="text-xs text-[var(--shell-text-muted)]">
          Référentiel des types de déplacement utilisés dans les demandes de course.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="relative block min-w-[12rem] text-sm sm:max-w-[16rem]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une désignation…"
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

          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              <Plus className="h-4 w-4" />
              Ajouter type
            </button>
          )}
        </div>
      </div>

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
              <Th>Désignation</Th>
              <Th>Créé le</Th>
              <Th>Modifié le</Th>
              <Th className="w-28">Actions</Th>
            </tr>
          </StickyThead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <Td colSpan={5} className="py-12 text-center text-[var(--shell-text-muted)]">
                  {rows.length === 0
                    ? "Aucun type enregistré."
                    : "Aucun résultat pour cette recherche."}
                </Td>
              </tr>
            ) : (
              filteredRows.map((row, index) => (
                <tr
                  key={row.id}
                  className="cursor-context-menu hover:bg-[var(--shell-hover)]"
                  onContextMenu={(e) =>
                    open(e, [
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
                    ])
                  }
                >
                  <Td className="tabular-nums text-[var(--shell-text-muted)]">{index + 1}</Td>
                  <Td className="font-medium">{row.designation}</Td>
                  <Td>{row.createdAt ? formatDate(row.createdAt) : "—"}</Td>
                  <Td>{row.updatedAt ? formatDate(row.updatedAt) : "—"}</Td>
                  <Td>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setViewing(row)}
                        className="rounded p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-sky-500"
                        aria-label="Visualiser"
                        title="Visualiser"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded p-1.5 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-sky-500"
                          aria-label="Éditer"
                          title="Éditer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(row)}
                          className="rounded p-1.5 text-red-400 hover:bg-red-500/10"
                          aria-label="Supprimer"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </StickyTable>
      )}

      {viewing && (
        <TypeCoursDetailModal typeCours={viewing} onClose={() => setViewing(null)} />
      )}

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--shell-text)]">
              {editing ? "Modifier le type de course" : "Nouveau type de course"}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-[var(--shell-text-muted)]">Désignation *</span>
                <input
                  required
                  value={form.designation}
                  onChange={(e) => setForm({ designation: e.target.value })}
                  placeholder="Mission, livraison, déplacement…"
                  className="mt-1 w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2"
                />
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
