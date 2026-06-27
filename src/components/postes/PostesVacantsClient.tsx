"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FilePlus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PosteViewModal } from "./PosteViewModal";
import {
  formatRemainingSlotsLabel,
  occupiedCount,
  plannedHeadcount,
  remainingSlots,
} from "@/lib/poste-headcount";
import { runDeleteWithSweetAlert, showLoadingAlert } from "@/lib/alerts";
import { statusLabel } from "@/lib/postes";
import type { Employee, JobPosition } from "@/lib/types";
import { cn } from "@/lib/utils";

type ContextAction = "view" | "edit" | "delete";

const MENU_W = 200;
const MENU_H = 130;

export function PostesVacantsClient({
  initialPositions,
  employees,
}: {
  initialPositions: JobPosition[];
  employees: Employee[];
}) {
  const router = useRouter();
  const [positions, setPositions] = useState(initialPositions);
  const [search, setSearch] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    positionId: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
    );
  }, [positions, search]);

  const viewPosition = viewId ? positions.find((p) => p.id === viewId) : null;
  const parentTitle = viewPosition?.reportsToId
    ? positions.find((p) => p.id === viewPosition.reportsToId)?.title
    : undefined;

  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMenu();
    const onClick = () => closeMenu();
    const t = window.setTimeout(() => window.addEventListener("click", onClick), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [menu, closeMenu]);

  function onContextMenu(e: React.MouseEvent, positionId: string) {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - MENU_W - 8);
    const y = Math.min(e.clientY, window.innerHeight - MENU_H - 8);
    setMenu({ x: Math.max(8, x), y: Math.max(8, y), positionId });
  }

  async function handleDelete(position: JobPosition) {
    const ok = await runDeleteWithSweetAlert(
      {
        title: "Supprimer ce poste ?",
        message: `« ${position.title} » (${position.code}) sera définitivement retiré. Cette action est irréversible.`,
        progressMessage: `Retrait de la fiche ${position.code}…`,
        successTitle: "Poste supprimé",
        successMessage: `Le poste « ${position.title} » a été retiré.`,
      },
      () => fetch(`/api/postes/${encodeURIComponent(position.id)}`, { method: "DELETE" })
    );
    if (ok) {
      setPositions((list) => list.filter((p) => p.id !== position.id));
      router.refresh();
    }
    closeMenu();
  }

  function runAction(action: ContextAction, id: string) {
    closeMenu();
    if (action === "view") setViewId(id);
    else if (action === "edit") {
      showLoadingAlert("Chargement de la fiche…", "Ouverture du formulaire de poste.");
      router.push(`/postes/nouvelle-fiche/${id}`);
    }
    else if (action === "delete") {
      const position = positions.find((p) => p.id === id);
      if (position) void handleDelete(position);
    }
  }

  return (
    <>
      <PageHeader
        title="Postes vacants"
        description="Postes avec au moins une place disponible (effectif prévu non atteint) — cliquez sur le code ou l'intitulé pour visualiser"
      >
        <Link
          href="/postes/nouvelle-fiche"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          <FilePlus className="h-4 w-4" />
          Nouvelle fiche
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Rechercher par intitulé, code, département…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-md flex-1"
        />
        <span className="text-sm text-[var(--shell-text-muted)]">
          {filtered.length} poste(s) avec place(s) disponible(s)
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--shell-border)] bg-[var(--shell-table-head)] text-xs uppercase tracking-wide text-[var(--shell-text-muted)]">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Intitulé</th>
              <th className="px-4 py-3">Département</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Places</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--shell-border)]">
            {filtered.map((p, i) => {
              const planned = plannedHeadcount(p);
              const occupied = occupiedCount(p, employees);
              const remaining = remainingSlots(p, employees);
              const remainingLabel = formatRemainingSlotsLabel(remaining);
              return (
              <tr
                key={p.id}
                onContextMenu={(e) => onContextMenu(e, p.id)}
                className={cn(
                  "cursor-context-menu transition-colors hover:bg-[var(--shell-hover)]",
                  i % 2 === 1 && "bg-[var(--shell-surface)]"
                )}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setViewId(p.id)}
                    className="font-mono text-xs font-medium text-sky-600 transition hover:text-sky-500 hover:underline"
                  >
                    {p.code}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setViewId(p.id)}
                    className="text-left font-medium text-[var(--shell-text)] transition hover:text-sky-600 hover:underline"
                  >
                    {p.title}
                  </button>
                </td>
                <td className="px-4 py-3 text-[var(--shell-text-muted)]">{p.department}</td>
                <td className="px-4 py-3 text-[var(--shell-text-muted)]">{p.grade}</td>
                <td className="px-4 py-3 text-[var(--shell-text-muted)]">
                  {planned > 1 ? (
                    <span className="tabular-nums">
                      {occupied}/{planned}
                      {remainingLabel && (
                        <span className="mt-0.5 block text-[10px] text-amber-600 dark:text-amber-400">
                          {remainingLabel}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">{remainingLabel || "1 place"}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-semibold",
                      remaining > 0
                        ? "badge-status-vacant"
                        : "bg-[var(--shell-hover)] text-[var(--shell-text-muted)]"
                    )}
                  >
                    {occupied === 0 ? statusLabel("vacant") : remainingLabel || statusLabel(p.status)}
                  </span>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-[var(--shell-text-muted)]">
            Aucun poste vacant. Créez une fiche ou libérez une affectation.
          </p>
        )}
      </div>

      {menu && (
        <ul
          role="menu"
          className="fixed z-[200] min-w-[200px] rounded-lg border border-[var(--shell-border)] bg-[var(--shell-card)] py-1 text-[var(--shell-text)] shadow-xl"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {(
            [
              { id: "view" as const, label: "Visualiser", icon: Eye },
              { id: "edit" as const, label: "Modifier", icon: Pencil },
              { id: "delete" as const, label: "Supprimer", icon: Trash2 },
            ] as const
          ).map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={cn(
                  "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium transition-colors",
                  item.id === "delete"
                    ? "text-red-600 hover:bg-red-50"
                    : "text-[var(--shell-text)] hover:bg-[var(--shell-hover)]"
                )}
                onClick={() => runAction(item.id, menu.positionId)}
              >
                <item.icon className="h-4 w-4 shrink-0 opacity-80" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewPosition && (
        <PosteViewModal
          position={viewPosition}
          employees={employees}
          parentTitle={parentTitle}
          onClose={() => setViewId(null)}
        />
      )}
    </>
  );
}
