"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FormationDetailModal } from "./FormationDetailModal";
import { Badge } from "@/components/ui/Badge";
import { readApiError, showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import { formationStatusBadgeClass, formationStatusLabel } from "@/lib/formations-utils";
import type { Employee, FormationRecord, FormationStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type TabId = "all" | FormationStatus;

const STATUS_TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "a_venir", label: "À venir" },
  { id: "en_cours", label: "En cours" },
  { id: "terminee", label: "Terminées" },
];

export function FormationsGestionClient() {
  const [formations, setFormations] = useState<FormationRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, eRes] = await Promise.all([
        fetch("/api/formations"),
        fetch("/api/employees"),
      ]);
      setFormations(await fRes.json());
      if (eRes.ok) setEmployees(await eRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const m = new Map<TabId, number>();
    m.set("all", formations.length);
    STATUS_TABS.forEach((t) => {
      if (t.id !== "all") m.set(t.id, formations.filter((f) => f.status === t.id).length);
    });
    return m;
  }, [formations]);

  const filtered = useMemo(() => {
    if (tab === "all") return formations;
    return formations.filter((f) => f.status === tab);
  }, [formations, tab]);

  async function remove(id: string) {
    if (!confirm("Supprimer cette formation ?")) return;
    const res = await fetch(`/api/formations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showErrorAlert(await readApiError(res));
      return;
    }
    showSuccessAlert("Formation supprimée");
    await load();
  }

  return (
    <>
      <PageHeader compact title="Liste des formations">
        <Link
          href="/formations/nouvelle"
          className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-500"
        >
          <Plus className="h-4 w-4" />
          Nouvelle formation
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--shell-border)]">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition",
              tab === t.id
                ? "text-sky-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-sky-500"
                : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-70">({counts.get(t.id) ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--shell-border)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--shell-surface)]/80 text-xs uppercase text-[var(--shell-text-muted)]">
            <tr>
              <th className="px-4 py-3">Formation</th>
              <th className="px-4 py-3">Période</th>
              <th className="px-4 py-3">Niveau</th>
              <th className="px-4 py-3">Instructeur</th>
              <th className="px-4 py-3">Participants</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[var(--shell-text-muted)]">
                  Chargement…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[var(--shell-text-muted)]">
                  Aucune formation dans cet onglet.
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.id} className="border-t border-[var(--shell-border)]/60 hover:bg-[var(--shell-surface)]/40">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDetailId(f.id)}
                      className="font-medium text-sky-400 hover:underline text-left"
                    >
                      {f.titre}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[var(--shell-text-muted)]">
                    {formatDate(f.dateDebut)} – {formatDate(f.dateFin)}
                  </td>
                  <td className="px-4 py-3">{f.niveau || "—"}</td>
                  <td className="px-4 py-3">{f.instructeur || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{f.participantCount}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn("text-[10px]", formationStatusBadgeClass(f.status))}>
                      {formationStatusLabel(f.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      title="Supprimer"
                      onClick={() => void remove(f.id)}
                      className="rounded p-1 text-red-400 hover:bg-[var(--shell-surface)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detailId && (
        <FormationDetailModal
          formationId={detailId}
          employees={employees}
          onClose={() => setDetailId(null)}
          onUpdated={() => void load()}
        />
      )}
    </>
  );
}
