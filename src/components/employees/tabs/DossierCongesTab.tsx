"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ListTree, Pencil, Table2, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { HistoryTableView, HistoryTimelineView } from "../DossierDataViews";
import { DossierField, DossierTextArea } from "../DossierFields";
import { DossierTabToolbar, type DossierSectionView } from "../DossierViewToggle";
import { useContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { CongeFormFields, type CongeFormValues } from "@/components/conges/CongeFormFields";
import { SaveButton } from "@/components/ui/SaveButton";
import { getEmployeeDossier, LEAVE_TYPE_LABELS } from "@/lib/employee-dossier";
import { effectiveLeaveRemaining, sumAnnualLeaveTaken } from "@/lib/conges-balance";
import type { LeaveBalance } from "@/lib/types";
import { addWorkingDays, countWorkingDays } from "@/lib/conges-working-days";
import { readApiError, showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import {
  alertInsufficientLeaveBalance,
  formatValidationLine,
  leaveStatusBadgeClass,
  leaveStatusLabel,
} from "@/lib/conges-display";
import { actionableValidationLevel } from "@/lib/conges-validation-access";
import { useAuth } from "@/contexts/AuthContext";
import type { Employee, LeaveRecord } from "@/lib/types";
import type { RhUser } from "@/lib/rh-users";
import { cn, formatDate } from "@/lib/utils";
import { LeaveHistoryLoading } from "../LeaveHistoryLoading";
import { LeaveCalendar } from "./LeaveCalendar";

function upsertLeaveRecord(list: LeaveRecord[], record: LeaveRecord): LeaveRecord[] {
  const idx = list.findIndex((l) => l.id === record.id);
  if (idx >= 0) return list.map((l) => (l.id === record.id ? record : l));
  return [...list, record];
}

export function DossierCongesTab({
  employee,
  view,
  onViewChange,
  onPatch,
  onPatchDossier,
  dossierLoading = false,
  showViewToggle = true,
}: {
  employee: Employee;
  view: DossierSectionView;
  onViewChange: (v: DossierSectionView) => void;
  onPatch: (data: Partial<Employee>) => void;
  onPatchDossier: (p: Partial<import("@/lib/types").EmployeeDossier>) => void;
  dossierLoading?: boolean;
  showViewToggle?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  const [historyYear, setHistoryYear] = useState(currentYear);
  const [historyView, setHistoryView] = useState<DossierSectionView>("cards");
  const hasLinkedPoste = Boolean(employee.positionId);
  const [leaves, setLeaves] = useState<LeaveRecord[]>(
    () => getEmployeeDossier(employee).leaveHistory ?? []
  );
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [rhUsers, setRhUsers] = useState<RhUser[]>([]);
  const [selectedRange, setSelectedRange] = useState({ start: today, end: today });
  const [showFormModal, setShowFormModal] = useState(false);
  const [savingLeave, setSavingLeave] = useState(false);
  const savingLeaveRef = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaveRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [draft, setDraft] = useState<CongeFormValues>({
    type: "annuel",
    startDate: today,
    endDate: today,
    days: 1,
    notes: "",
    validateur1: "",
    validateur2: "",
  });
  const { open: openCtx, menuNode } = useContextMenu();
  const { user, permissions } = useAuth();

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

  const [balanceEmployee, setBalanceEmployee] = useState(employee);
  const balanceRef = useRef(balanceEmployee);
  balanceRef.current = balanceEmployee;

  const applyLeaveBalanceLocal = useCallback((leaveBalance: LeaveBalance) => {
    const next = { ...balanceRef.current, leaveBalance };
    setBalanceEmployee(next);
    balanceRef.current = next;
  }, []);

  useEffect(() => {
    setBalanceEmployee(employee);
    const preloaded = getEmployeeDossier(employee).leaveHistory;
    if (preloaded !== undefined) setLeaves(preloaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset au changement d'employé uniquement
  }, [employee.id]);

  useEffect(() => {
    if (!hasLinkedPoste) {
      setLeaves([]);
      return;
    }
    const preloaded = getEmployeeDossier(employee).leaveHistory;
    if (preloaded !== undefined) setLeaves(preloaded);
    if (employee.leaveBalance) applyLeaveBalanceLocal(employee.leaveBalance);
  }, [
    employee.dossier?.leaveHistory,
    employee.leaveBalance,
    employee.id,
    hasLinkedPoste,
    applyLeaveBalanceLocal,
  ]);

  const applyLeaveBalance = useCallback(
    (leaveBalance: LeaveBalance) => {
      const next = { ...balanceRef.current, leaveBalance };
      setBalanceEmployee(next);
      balanceRef.current = next;
      onPatch({ leaveBalance });
    },
    [onPatch]
  );

  const leaveStats = balanceEmployee.leaveBalance;
  const leaveTotal = leaveStats.acquired;
  const leaveTaken = leaveStats.taken;
  const leaveRemaining = effectiveLeaveRemaining(leaveStats);

  const historyYears = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const l of leaves) {
      set.add(new Date(l.startDate).getFullYear());
      set.add(new Date(l.endDate).getFullYear());
    }
    return [...set].sort((a, b) => b - a);
  }, [leaves, currentYear]);

  const selectedWorkingDays = countWorkingDays(selectedRange.start, selectedRange.end);
  const hasMultiDaySelection = selectedRange.start !== selectedRange.end && selectedWorkingDays > 0;

  const leaveBalanceMax = useMemo(() => {
    let max = leaveRemaining;
    if (editingId && draft.type === "annuel") {
      const existing = leaves.find((l) => l.id === editingId);
      if (existing?.type === "annuel") max += existing.days;
    }
    return max;
  }, [leaveRemaining, editingId, draft.type, leaves]);

  const filteredLeaves = useMemo(() => {
    return [...leaves]
      .filter((l) => {
        const startY = new Date(l.startDate).getFullYear();
        const endY = new Date(l.endDate).getFullYear();
        return startY <= historyYear && endY >= historyYear;
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [leaves, historyYear]);

  const historyLoadSeq = useRef(0);

  const historyLoading = dossierLoading || historyRefreshing;

  const reloadCongesFromColumn = useCallback(async () => {
    if (!hasLinkedPoste) {
      setLeaves([]);
      return;
    }
    const seq = ++historyLoadSeq.current;
    setHistoryRefreshing(true);
    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(employee.id)}/conges`);
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      const data = (await res.json()) as {
        conges?: LeaveRecord[];
        leaveBalance?: LeaveBalance | null;
      };
      if (seq !== historyLoadSeq.current) return;
      const nextLeaves = data.conges ?? [];
      setLeaves(nextLeaves);
      onPatchDossier({ leaveHistory: nextLeaves });
      if (data.leaveBalance) applyLeaveBalanceLocal(data.leaveBalance);
    } catch (err) {
      if (seq !== historyLoadSeq.current) return;
      showErrorAlert(
        err instanceof Error ? err.message : "Impossible de charger l'historique des congés."
      );
      setLeaves([]);
    } finally {
      if (seq === historyLoadSeq.current) setHistoryRefreshing(false);
    }
  }, [applyLeaveBalanceLocal, employee.id, hasLinkedPoste, onPatchDossier]);

  useEffect(() => {
    if (!hasLinkedPoste) return;
    fetch("/api/utilisateurs/rh")
      .then((r) => r.json())
      .then(setRhUsers)
      .catch(() => setRhUsers([]));
  }, [hasLinkedPoste]);

  const openNewLeaveForm = useCallback(async () => {
    if (!hasLinkedPoste) return;
    const stats = balanceRef.current.leaveBalance;
    const periodStart = stats.reinitAt ?? stats.referenceDate ?? null;
    const max = Math.max(0, stats.acquired - sumAnnualLeaveTaken(leaves, periodStart));

    const rawDays = countWorkingDays(selectedRange.start, selectedRange.end);
    if (draft.type === "annuel" && rawDays > max) {
      await alertInsufficientLeaveBalance(max, rawDays);
      return;
    }
    const days = rawDays;
    setEditingId(null);
    setDraft({
      type: "annuel",
      startDate: selectedRange.start,
      endDate: addWorkingDays(selectedRange.start, days),
      days,
      notes: "",
      validateur1: "",
      validateur2: "",
    });
    setShowFormModal(true);
  }, [draft.type, hasLinkedPoste, leaves, selectedRange.end, selectedRange.start]);

  const saveLeave = useCallback(async () => {
    if (!hasLinkedPoste || savingLeaveRef.current) return;

    const stats = balanceRef.current.leaveBalance;
    const periodStart = stats.reinitAt ?? stats.referenceDate ?? null;
    let available = Math.max(0, stats.acquired - sumAnnualLeaveTaken(leaves, periodStart));
    if (editingId && draft.type === "annuel") {
      const existing = leaves.find((l) => l.id === editingId);
      if (existing?.type === "annuel") available += existing.days;
    }
    if (draft.type === "annuel" && draft.days > available) {
      await alertInsufficientLeaveBalance(available, draft.days);
      return;
    }

    savingLeaveRef.current = true;
    setSavingLeave(true);
    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(employee.id)}/conges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          type: draft.type,
          startDate: draft.startDate,
          endDate: draft.endDate,
          notes: draft.notes || undefined,
          validateur1: draft.validateur1 || null,
          validateur2: draft.validateur2 || null,
        }),
      });
      if (!res.ok) {
        showErrorAlert(await readApiError(res));
        return;
      }
      const data = (await res.json()) as {
        conge?: LeaveRecord;
        conges?: LeaveRecord[];
        leaveBalance?: LeaveBalance;
      };
      const nextLeaves =
        data.conges ?? (data.conge ? upsertLeaveRecord(leaves, data.conge) : leaves);
      setLeaves(nextLeaves);
      onPatchDossier({ leaveHistory: nextLeaves });
      if (data.leaveBalance) applyLeaveBalance(data.leaveBalance);
      showSuccessAlert(editingId ? "Congé modifié" : "Demande enregistrée");
      setEditingId(null);
      setShowFormModal(false);
    } finally {
      savingLeaveRef.current = false;
      setSavingLeave(false);
    }
  }, [
    draft.days,
    draft.endDate,
    draft.notes,
    draft.startDate,
    draft.type,
    draft.validateur1,
    draft.validateur2,
    editingId,
    employee.id,
    applyLeaveBalance,
    hasLinkedPoste,
    leaves,
    onPatchDossier,
  ]);

  const actionBtnClass =
    "rounded-md p-1 text-[var(--shell-text-muted)] transition hover:bg-[var(--shell-surface)] hover:text-[var(--shell-text)]";

  function renderLeaveActions(leave: LeaveRecord) {
    const level = validationContext
      ? actionableValidationLevel(
          { ...leave, department: employee.department },
          validationContext
        )
      : null;
    return (
      <>
        <button
          type="button"
          title="Modifier"
          aria-label="Modifier le congé"
          className={actionBtnClass}
          onClick={(e) => {
            e.stopPropagation();
            openEdit(leave);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {level && !["refuse", "termine", "approuve"].includes(leave.status) && (
          <button
            type="button"
            title={`Valider (niveau ${level})`}
            aria-label={`Valider niveau ${level}`}
            className={cn(actionBtnClass, "hover:text-emerald-500")}
            onClick={(e) => {
              e.stopPropagation();
              void validateLevel(leave.id, level);
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </button>
        )}
        {["demande", "validation_1", "validation_2"].includes(leave.status) && (
          <button
            type="button"
            title="Rejeter"
            aria-label="Rejeter le congé"
            className={cn(actionBtnClass, "hover:text-amber-500")}
            onClick={(e) => {
              e.stopPropagation();
              setRejectTarget(leave);
              setRejectReason("");
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          title="Retirer"
          aria-label="Retirer le congé"
          className={cn(actionBtnClass, "hover:text-red-500")}
          onClick={(e) => {
            e.stopPropagation();
            void removeLeave(leave.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </>
    );
  }

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
    await reloadCongesFromColumn();
  }

  async function updateLeave(id: string, status: LeaveRecord["status"], notes?: string) {
    const res = await fetch(`/api/conges/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) {
      showErrorAlert(await readApiError(res));
      return;
    }
    await reloadCongesFromColumn();
  }

  async function removeLeave(id: string) {
    const res = await fetch(`/api/conges/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showErrorAlert(await readApiError(res));
      return;
    }
    await reloadCongesFromColumn();
  }

  function openEdit(leave: LeaveRecord) {
    setEditingId(leave.id);
    setDraft({
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: leave.days,
      notes: leave.notes ?? "",
      validateur1: leave.validateur1 ?? "",
      validateur2: leave.validateur2 ?? "",
    });
    setSelectedRange({ start: leave.startDate, end: leave.endDate });
    setShowFormModal(true);
  }

  function openMenu(e: React.MouseEvent, leave: LeaveRecord) {
    const level = validationContext
      ? actionableValidationLevel(
          { ...leave, department: employee.department },
          validationContext
        )
      : null;
    const items: ContextMenuItem[] = [
      { id: "edit", label: "Modifier", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => openEdit(leave) },
    ];
    if (level && !["refuse", "termine", "approuve"].includes(leave.status)) {
      items.push({
        id: "validate",
        label: `Valider (niveau ${level})`,
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        onClick: () => void validateLevel(leave.id, level),
      });
    }
    if (["demande", "validation_1", "validation_2"].includes(leave.status)) {
      items.push({
        id: "reject",
        label: "Rejeter (avec raison)",
        icon: <X className="h-3.5 w-3.5" />,
        onClick: () => {
          setRejectTarget(leave);
          setRejectReason("");
        },
      });
    }
    items.push({ id: "remove", label: "Retirer", danger: true, onClick: () => void removeLeave(leave.id) });
    openCtx(e, items);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="shrink-0">
      <DossierTabToolbar
        title="Mes congés"
        view={view}
        onViewChange={onViewChange}
        showViewToggle={false}
        actions={
          <div className="ml-auto flex flex-wrap items-end gap-4 sm:gap-5">
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--shell-text-muted)]">Total</p>
              <p className="text-lg font-bold tabular-nums leading-tight text-[var(--shell-text)] sm:text-xl">
                {leaveTotal}
                <span className="ml-0.5 text-xs font-medium text-[var(--shell-text-muted)]">j</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--shell-text-muted)]">Pris</p>
              <p className="text-lg font-bold tabular-nums leading-tight text-[var(--shell-text)] sm:text-xl">
                {leaveTaken}
                <span className="ml-0.5 text-xs font-medium text-[var(--shell-text-muted)]">j</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--shell-text-muted)]">Solde</p>
              <p className="text-lg font-bold tabular-nums leading-tight text-emerald-500 sm:text-xl">
                {leaveRemaining}
                <span className="ml-0.5 text-xs font-medium text-[var(--shell-text-muted)]">j</span>
              </p>
            </div>
          </div>
        }
      />
      </div>

      {!hasLinkedPoste && (
        <p className="shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
          Aucune fiche de poste liée — les congés seront disponibles après affectation à un poste.
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[30%_minmax(0,1fr)] lg:items-stretch">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80">
          <h4 className="shrink-0 border-b border-[var(--shell-border)] px-3 py-2 text-[10px] font-semibold uppercase text-[var(--shell-text-muted)]">
            Calendrier
          </h4>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
            <LeaveCalendar
              leaves={hasLinkedPoste ? leaves : []}
              selectedStartDate={selectedRange.start}
              selectedEndDate={selectedRange.end}
              selectionWorkingDays={selectedWorkingDays}
              showAddAction={hasLinkedPoste && hasMultiDaySelection}
              onAddSelection={() => void openNewLeaveForm()}
              onSelectRange={(startIso, endIso) => {
                setSelectedRange({ start: startIso, end: endIso });
                setDraft((d) => ({
                  ...d,
                  startDate: startIso,
                  endDate: endIso,
                  days: countWorkingDays(startIso, endIso),
                }));
              }}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--shell-border)] px-3 py-2">
            <h4 className="text-xs font-semibold uppercase text-[var(--shell-text-muted)]">
              Historique des congés
            </h4>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs">
                <span className="text-[10px] text-[var(--shell-text-muted)]">Année</span>
                <select
                  className="input min-w-[5rem] py-1 text-xs"
                  value={historyYear}
                  onChange={(e) => setHistoryYear(Number(e.target.value))}
                >
                  {historyYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <div
                className="inline-flex rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-0.5"
                role="group"
                aria-label="Mode d'affichage de l'historique"
              >
                <button
                  type="button"
                  title="Chronologie"
                  aria-label="Chronologie"
                  onClick={() => setHistoryView("cards")}
                  className={cn(
                    "rounded-md p-1.5 transition",
                    historyView === "cards"
                      ? "bg-sky-600 text-white"
                      : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
                  )}
                >
                  <ListTree className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Tableau"
                  aria-label="Tableau"
                  onClick={() => setHistoryView("table")}
                  className={cn(
                    "rounded-md p-1.5 transition",
                    historyView === "table"
                      ? "bg-sky-600 text-white"
                      : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
                  )}
                >
                  <Table2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3">
            {!hasLinkedPoste ? (
              <p className="py-6 text-center text-sm text-[var(--shell-text-muted)]">
                Historique indisponible sans poste lié.
              </p>
            ) : historyLoading ? (
              <LeaveHistoryLoading variant={historyView === "table" ? "table" : "cards"} />
            ) : historyView === "cards" ? (
              <HistoryTimelineView
                compact
                showHover
                items={filteredLeaves.map((l) => ({
                  id: l.id,
                  date: `${formatDate(l.startDate)} – ${formatDate(l.endDate)}`,
                  title: LEAVE_TYPE_LABELS[l.type],
                  amount: `${l.days} j ouvrables`,
                  subtitle: `V1 : ${formatValidationLine(l.validateur1, l.validation1At)} · V2 : ${formatValidationLine(l.validateur2, l.validation2At)}`,
                  status: (
                    <Badge className={`shrink-0 text-[10px] ${leaveStatusBadgeClass(l.status)}`}>
                      {leaveStatusLabel(l.status)}
                    </Badge>
                  ),
                  actions: renderLeaveActions(l),
                }))}
                emptyMessage={`Aucun congé en ${historyYear}.`}
                onItemContextMenu={(e, id) => {
                  const leave = leaves.find((x) => x.id === id);
                  if (leave) openMenu(e, leave);
                }}
              />
            ) : (
              <HistoryTableView
                columns={[
                  { key: "type", label: "Type" },
                  { key: "period", label: "Période" },
                  { key: "days", label: "Jours" },
                  { key: "v1", label: "Validateur 1" },
                  { key: "v2", label: "Validateur 2" },
                  { key: "status", label: "Statut" },
                ]}
                rows={filteredLeaves.map((l) => ({
                  id: l.id,
                  cells: [
                    LEAVE_TYPE_LABELS[l.type],
                    `${formatDate(l.startDate)} – ${formatDate(l.endDate)}`,
                    String(l.days),
                    formatValidationLine(l.validateur1, l.validation1At),
                    formatValidationLine(l.validateur2, l.validation2At),
                    <Badge key="status" className={`text-[10px] ${leaveStatusBadgeClass(l.status)}`}>
                      {leaveStatusLabel(l.status)}
                    </Badge>,
                  ],
                }))}
                onRowContextMenu={(e, rowId) => {
                  const leave = leaves.find((x) => x.id === rowId);
                  if (leave) openMenu(e, leave);
                }}
                emptyMessage={`Aucun congé en ${historyYear}.`}
              />
            )}
          </div>
        </div>
      </div>
      {menuNode}

      {showFormModal && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-5">
            <h4 className="mb-4 text-lg font-semibold">
              {editingId ? "Modifier le congé" : "Nouvelle demande de congé"}
            </h4>
            <CongeFormFields
              rhUsers={rhUsers}
              values={draft}
              leaveBalanceMax={leaveBalanceMax}
              onChange={(p) => {
                const next = { ...draft, ...p };
                if (next.type === "annuel" && next.days > leaveBalanceMax) {
                  void alertInsufficientLeaveBalance(leaveBalanceMax, next.days);
                  return;
                }
                setDraft(next);
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={savingLeave}
                onClick={() => setShowFormModal(false)}
                className="rounded-lg border border-[var(--shell-border)] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuler
              </button>
              <SaveButton
                saving={savingLeave}
                savingLabel="Enregistrement…"
                disabled={draft.type === "annuel" && leaveBalanceMax < 1}
                onClick={() => void saveLeave()}
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500"
              >
                Enregistrer
              </SaveButton>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-[76] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-5">
            <h4 className="mb-3 text-lg font-semibold">Rejeter le congé</h4>
            <DossierField label="Raison du rejet" required>
              <DossierTextArea value={rejectReason} onChange={setRejectReason} rows={3} />
            </DossierField>
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
                  void updateLeave(
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
