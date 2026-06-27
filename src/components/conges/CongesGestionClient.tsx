"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Pencil, Trash2, X } from "lucide-react";
import { useContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { CongeFormFields, type CongeFormValues } from "./CongeFormFields";
import { employeeDossierHref } from "@/lib/employee-dossier-url";
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS } from "@/lib/employee-dossier";
import { formatValidationLine } from "@/lib/conges-display";
import { actionableValidationLevel } from "@/lib/conges-validation-access";
import { readApiError, showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import { useAuth } from "@/contexts/AuthContext";
import type { CongeWithEmployee, LeaveRequestStatus } from "@/lib/types";
import type { RhUser } from "@/lib/rh-users";
import { FolderTabs } from "@/components/layout/FolderTabs";
import { formatDate } from "@/lib/utils";

type TabId = "all" | LeaveRequestStatus;

const STATUS_TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "demande", label: "En demande" },
  { id: "validation_1", label: "Validation 1" },
  { id: "validation_2", label: "Validation 2" },
  { id: "approuve", label: "Approuvés" },
  { id: "refuse", label: "Refusés" },
  { id: "termine", label: "Terminés" },
];

export function CongesGestionClient() {
  const { user, permissions } = useAuth();
  const [conges, setConges] = useState<CongeWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("all");
  const [rhUsers, setRhUsers] = useState<RhUser[]>([]);
  const [editTarget, setEditTarget] = useState<CongeWithEmployee | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CongeWithEmployee | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState<CongeFormValues | null>(null);
  const { open: openCtx, menuNode } = useContextMenu();

  const validationContext = useMemo(
    () =>
      user
        ? {
            username: user.username,
            permissions,
            matriculAgent: user.matriculAgent,
            validatorDepartment: user.validatorDepartment ?? null,
          }
        : null,
    [user, permissions]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/conges");
      setConges(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    fetch("/api/utilisateurs/rh")
      .then((r) => r.json())
      .then(setRhUsers)
      .catch(() => setRhUsers([]));
  }, [load]);

  const counts = useMemo(() => {
    const m = new Map<TabId, number>();
    m.set("all", conges.length);
    STATUS_TABS.forEach((t) => {
      if (t.id !== "all") m.set(t.id, conges.filter((c) => c.status === t.id).length);
    });
    return m;
  }, [conges]);

  const filtered = useMemo(() => {
    if (tab === "all") return conges;
    return conges.filter((c) => c.status === tab);
  }, [conges, tab]);

  async function validateLevel(id: string, level: 1 | 2) {
    const res = await fetch(`/api/conges/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "validate", level }),
    });
    if (!res.ok) {
      showErrorAlert(await readApiError(res));
      return;
    }
    showSuccessAlert(`Validation niveau ${level} enregistrée`);
    await load();
  }

  async function patchStatus(id: string, status: LeaveRequestStatus, notes?: string) {
    const res = await fetch(`/api/conges/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) {
      showErrorAlert(await readApiError(res));
      return;
    }
    showSuccessAlert("Statut mis à jour");
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/conges/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showErrorAlert(await readApiError(res));
      return;
    }
    showSuccessAlert("Congé supprimé");
    await load();
  }

  function openEdit(c: CongeWithEmployee) {
    setEditTarget(c);
    setForm({
      type: c.type,
      startDate: c.startDate,
      endDate: c.endDate,
      days: c.days,
      notes: c.notes ?? "",
      validateur1: c.validateur1 ?? "",
      validateur2: c.validateur2 ?? "",
    });
  }

  async function saveEdit() {
    if (!editTarget || !form) return;
    const res = await fetch(`/api/conges/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        notes: form.notes,
        validateur1: form.validateur1 || null,
        validateur2: form.validateur2 || null,
      }),
    });
    if (!res.ok) {
      showErrorAlert(await readApiError(res));
      return;
    }
    setEditTarget(null);
    setForm(null);
    showSuccessAlert("Congé modifié");
    await load();
  }

  function openMenu(e: React.MouseEvent, c: CongeWithEmployee) {
    const level = validationContext
      ? actionableValidationLevel(c, validationContext)
      : null;
    const items: ContextMenuItem[] = [
      {
        id: "edit",
        label: "Modifier",
        icon: <Pencil className="h-3.5 w-3.5" />,
        onClick: () => openEdit(c),
      },
    ];
    if (level && !["refuse", "termine", "approuve"].includes(c.status)) {
      items.push({
        id: "validate",
        label: `Valider (niveau ${level})`,
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        onClick: () => void validateLevel(c.id, level),
      });
    }
    if (["demande", "validation_1", "validation_2"].includes(c.status)) {
      items.push({
        id: "reject",
        label: "Rejeter",
        icon: <X className="h-3.5 w-3.5" />,
        onClick: () => {
          setRejectTarget(c);
          setRejectReason("");
        },
      });
    }
    if (c.status === "approuve") {
      items.push({
        id: "termine",
        label: "Marquer terminé",
        onClick: () => void patchStatus(c.id, "termine"),
      });
    }
    items.push({
      id: "remove",
      label: "Supprimer",
      danger: true,
      icon: <Trash2 className="h-3.5 w-3.5" />,
      onClick: () => void remove(c.id),
    });
    openCtx(e, items);
  }

  return (
    <div className="space-y-0">
      <div className="-mx-8">
        <div className="px-8 py-3">
          <h1 className="text-sm font-semibold text-[var(--shell-text)]">Gestion des congés</h1>
        </div>
        <div className="px-8">
          <FolderTabs
            tabs={STATUS_TABS.map((t) => ({
              id: t.id,
              label: t.label,
              count: counts.get(t.id) ?? 0,
            }))}
            active={tab}
            onChange={(id) => setTab(id as TabId)}
          />
        </div>
      </div>

      <div className="overflow-x-auto pt-3">
        {loading ? (
          <p className="text-sm text-[var(--shell-text-muted)]">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--shell-text-muted)]">Aucun congé.</p>
        ) : (
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--shell-text-muted)]">
                <th className="pb-2 font-medium">Agent</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Période</th>
                <th className="pb-2 font-medium">Jours</th>
                <th className="pb-2 font-medium">Validateur 1</th>
                <th className="pb-2 font-medium">Validateur 2</th>
                <th className="pb-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-context-menu hover:bg-[var(--shell-hover)]"
                  onContextMenu={(e) => openMenu(e, c)}
                >
                  <td className="py-2 pr-2">
                    {c.employeeId ? (
                      <Link
                        href={employeeDossierHref(c.employeeId, { tab: "conges" })}
                        className="text-sky-500 hover:underline"
                      >
                        {c.employeeName ?? c.matriculeEmploye}
                      </Link>
                    ) : (
                      c.employeeName ?? c.matriculeEmploye
                    )}
                    <span className="block text-xs text-[var(--shell-text-muted)]">
                      {c.matriculeEmploye}
                    </span>
                  </td>
                  <td className="py-2">{LEAVE_TYPE_LABELS[c.type]}</td>
                  <td className="py-2 text-xs">
                    {formatDate(c.startDate)} → {formatDate(c.endDate)}
                  </td>
                  <td className="py-2 tabular-nums">{c.days}</td>
                  <td className="max-w-[11rem] py-2 text-xs text-[var(--shell-text-muted)]">
                    {formatValidationLine(c.validateur1, c.validation1At)}
                  </td>
                  <td className="max-w-[11rem] py-2 text-xs text-[var(--shell-text-muted)]">
                    {formatValidationLine(c.validateur2, c.validation2At)}
                  </td>
                  <td className="py-2">{LEAVE_STATUS_LABELS[c.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-xs text-[var(--shell-text-muted)]">
          Clic droit sur une ligne — valider, modifier, rejeter.
        </p>
      </div>

      {menuNode}

      {editTarget && form && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-5">
            <h4 className="mb-4 text-lg font-semibold">Modifier le congé</h4>
            <CongeFormFields rhUsers={rhUsers} values={form} onChange={(p) => setForm({ ...form, ...p })} />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditTarget(null);
                  setForm(null);
                }}
                className="rounded-lg border border-[var(--shell-border)] px-3 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-[76] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-5">
            <h4 className="mb-3 text-lg font-semibold">Rejeter le congé</h4>
            <textarea
              className="input w-full"
              rows={3}
              placeholder="Motif du rejet"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-lg border border-[var(--shell-border)] px-3 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectReason.trim()) return;
                  void patchStatus(
                    rejectTarget.id,
                    "refuse",
                    `${rejectTarget.notes ?? ""}\nMotif rejet: ${rejectReason}`.trim()
                  ).then(() => setRejectTarget(null));
                }}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
