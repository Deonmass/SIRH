"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Save, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { readApiError, showErrorAlert, showSuccessAlert, showWarningAlert } from "@/lib/alerts";
import {
  canCreatePointageDay,
  canModifyRecordedPointageDay,
  POINTAGE_SAISIE_SECTION,
} from "@/lib/pointage-access";
import { mergeJoursForMonthWithConges } from "@/lib/pointage-conges";
import {
  dayOfMonth,
  defaultJourEntry,
  draftJourEntryForNewCell,
  formatPointageResumeShort,
  formatPointageResumeTooltip,
  getPointageMonthWeeks,
  getPointageStatutShort,
  isFuturePointageDate,
  isPointageCellFilled,
  isWeekendDate,
  moisAnneeFromParts,
  statutBadgeClass,
  visiblePointageDays,
  WEEKDAY_LETTERS,
  weekendCellClass,
  weekendHeaderClass,
  weekdayIndex,
} from "@/lib/pointage-utils";
import type { DbPointageJourJson } from "../../../database/migrations/019_pointage_table.types";
import type { CongeWithEmployee, Employee, PointageRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PointageCellModal } from "@/components/pointage/PointageCellModal";
import { PointagePeriodSelect } from "@/components/pointage/PointagePeriodSelect";

const EMPLOYEE_COL = "8.5rem";

type FeuilleState = {
  recordId: string | null;
  verrouille: boolean;
  jours: Map<string, DbPointageJourJson>;
  persistedDates: Set<string>;
};

type CellTarget = {
  matricule: string;
  employeLabel: string;
  date: string;
  readOnly: boolean;
};

type DragPaintSession = {
  touchedCells: Set<string>;
  snapshots: Map<string, Map<string, DbPointageJourJson>>;
};

type PendingBulkSave = DragPaintSession;

function paintCellKey(matricule: string, date: string): string {
  return `${matricule}|${date}`;
}

function parsePaintCellKey(key: string): { matricule: string; date: string } {
  const sep = key.indexOf("|");
  return { matricule: key.slice(0, sep), date: key.slice(sep + 1) };
}

function activeEmployees(list: Employee[]): Employee[] {
  return list.filter((e) => !["sorti", "licencie", "candidat"].includes(e.status));
}

function groupByDepartment(employees: Employee[]): { dept: string; employees: Employee[] }[] {
  const map = new Map<string, Employee[]>();
  for (const e of employees) {
    const dept = e.department?.trim() || "Sans département";
    const arr = map.get(dept) ?? [];
    arr.push(e);
    map.set(dept, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, "fr"))
    .map(([dept, emps]) => ({
      dept,
      employees: emps.sort((a, b) =>
        `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr")
      ),
    }));
}

function joursToMap(jours: DbPointageJourJson[]): Map<string, DbPointageJourJson> {
  return new Map(jours.map((j) => [j.date, j]));
}

function mapToJoursArray(map: Map<string, DbPointageJourJson>): DbPointageJourJson[] {
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function cellHoverTitle(
  jour: DbPointageJourJson | undefined,
  filled: boolean,
  date: string,
  future: boolean,
  editable: boolean
): string {
  if (future) return `Jour futur — saisie indisponible (${date})`;
  if (!editable) return `Modification réservée — permission requise (${date})`;
  if (!filled || !jour) return `Saisir — ${date}`;
  const lines = [`${getPointageStatutShort(jour.statut)} — ${date}`];
  const comment = jour.commentaire?.trim();
  if (comment) lines.push(comment);
  return lines.join("\n");
}

export function PointageSaisieClient() {
  const searchParams = useSearchParams();
  const { can, permissions, user } = useAuth();
  const now = new Date();
  const defaultMois = moisAnneeFromParts(now.getFullYear(), now.getMonth() + 1);
  const mois = searchParams.get("mois") ?? defaultMois;

  const canSaisir = canCreatePointageDay(permissions, user?.username);
  const canModifier = canModifyRecordedPointageDay(permissions, user?.username);
  const canReadSaisie = can(POINTAGE_SAISIE_SECTION, "read");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [feuilles, setFeuilles] = useState<Map<string, FeuilleState>>(new Map());
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [cellTarget, setCellTarget] = useState<CellTarget | null>(null);
  const [pendingBulkSave, setPendingBulkSave] = useState<PendingBulkSave | null>(null);
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [asOf, setAsOf] = useState(() => new Date());
  const dragPaintRef = useRef<DragPaintSession | null>(null);
  const feuillesRef = useRef<Map<string, FeuilleState>>(new Map());

  const visibleDays = useMemo(() => visiblePointageDays(mois), [mois]);
  const weekGroups = useMemo(() => {
    const visibleSet = new Set(visibleDays);
    return getPointageMonthWeeks(mois)
      .map((w) => ({
        ...w,
        dates: w.dates.filter((d) => visibleSet.has(d)),
      }))
      .filter((w) => w.dates.length > 0);
  }, [mois, visibleDays]);
  const departments = useMemo(() => groupByDepartment(activeEmployees(employees)), [employees]);

  useEffect(() => {
    feuillesRef.current = feuilles;
  }, [feuilles]);

  useEffect(() => {
    const refreshAsOf = () => setAsOf(new Date());
    refreshAsOf();
    const timer = window.setInterval(refreshAsOf, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshAsOf();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refreshAsOf);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refreshAsOf);
    };
  }, []);

  const isFutureDay = useCallback((date: string) => isFuturePointageDate(date, asOf), [asOf]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, ptgRes, congesRes] = await Promise.all([
        fetch("/api/employees"),
        fetch(`/api/pointage?mois=${encodeURIComponent(mois)}`),
        fetch("/api/conges"),
      ]);

      const emps: Employee[] = empRes.ok ? await empRes.json() : [];
      const conges: CongeWithEmployee[] = congesRes.ok ? await congesRes.json() : [];
      const records: PointageRecord[] = ptgRes.ok ? await ptgRes.json() : [];
      const recordByMat = new Map(records.map((r) => [r.matriculeEmploye, r]));

      if (empRes.ok) setEmployees(emps);

      const nextFeuilles = new Map<string, FeuilleState>();

      for (const emp of activeEmployees(emps)) {
        const rec = recordByMat.get(emp.matricule);
        const empConges = conges.filter((c) => c.matriculeEmploye === emp.matricule);
        const storedJours = (rec?.jours ?? []) as DbPointageJourJson[];
        const persistedDates = new Set(storedJours.map((j) => j.date));

        if (rec?.verrouille) {
          const displayJours = storedJours.filter((j) => !isFuturePointageDate(j.date));
          nextFeuilles.set(emp.matricule, {
            recordId: rec.id || null,
            verrouille: true,
            jours: joursToMap(displayJours),
            persistedDates,
          });
          continue;
        }

        const merged = mergeJoursForMonthWithConges(mois, storedJours, empConges);
        nextFeuilles.set(emp.matricule, {
          recordId: rec?.id || null,
          verrouille: rec?.verrouille ?? false,
          jours: joursToMap(merged),
          persistedDates,
        });
      }

      setFeuilles(nextFeuilles);
    } finally {
      setLoading(false);
    }
  }, [mois]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function toggleDept(dept: string) {
    setCollapsedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  }

  function getJour(matricule: string, date: string): DbPointageJourJson | undefined {
    return feuilles.get(matricule)?.jours.get(date);
  }

  function isPersisted(matricule: string, date: string): boolean {
    return feuilles.get(matricule)?.persistedDates.has(date) ?? false;
  }

  function canEditCell(matricule: string, date: string, filled: boolean): boolean {
    const feuille = feuilles.get(matricule);
    if (!feuille || feuille.verrouille || isFutureDay(date)) return false;
    if (!filled) return canSaisir;
    if (isPersisted(matricule, date)) return canModifier;
    return canSaisir;
  }

  function openCell(matricule: string, employeLabel: string, date: string) {
    const feuille = feuilles.get(matricule);
    if (!feuille || feuille.verrouille || isFutureDay(date)) return;

    const jour = getJour(matricule, date);
    const filled = isPointageCellFilled(jour);
    const editable = canEditCell(matricule, date, filled);

    if (!editable) {
      if (filled && isPersisted(matricule, date) && !canModifier) {
        void showWarningAlert(
          "Modification non autorisée",
          "La modification d'un jour déjà enregistré nécessite la permission « Modifier un jour déjà enregistré »."
        );
      } else if (!canSaisir) {
        void showWarningAlert(
          "Saisie non autorisée",
          "Vous n'avez pas la permission de saisir le pointage."
        );
      }
      return;
    }

    setCellTarget({
      matricule,
      employeLabel,
      date,
      readOnly: false,
    });
  }

  async function saveCell(matricule: string, updated: DbPointageJourJson) {
    const key = `${matricule}-${updated.date}`;
    setSavingCell(key);
    try {
      const prev = feuilles.get(matricule);
      const joursMap = new Map(prev?.jours ?? []);
      joursMap.set(updated.date, updated);
      const jours = mapToJoursArray(joursMap);

      const res = await fetch("/api/pointage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matriculeEmploye: matricule,
          moisAnnee: mois,
          jours,
          verrouille: prev?.verrouille ?? false,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const saved = (await res.json()) as PointageRecord;

      setFeuilles((m) => {
        const next = new Map(m);
        const savedJours = saved.jours as DbPointageJourJson[];
        next.set(matricule, {
          recordId: saved.id || null,
          verrouille: saved.verrouille,
          jours: joursToMap(savedJours),
          persistedDates: new Set(savedJours.map((j) => j.date)),
        });
        return next;
      });
      showSuccessAlert("Jour enregistré");
    } catch (e) {
      showErrorAlert(e instanceof Error ? e.message : "Erreur");
      throw e;
    } finally {
      setSavingCell(null);
    }
  }

  const saveEmployeeDays = useCallback(async (
    matricule: string,
    recordId: string | null,
    verrouille: boolean,
    joursMap: Map<string, DbPointageJourJson>,
    options?: { successMessage?: string; notify?: boolean }
  ) => {
    setSavingCell(`${matricule}-bulk`);
    try {
      const res = await fetch("/api/pointage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recordId ?? undefined,
          matriculeEmploye: matricule,
          moisAnnee: mois,
          jours: mapToJoursArray(joursMap),
          verrouille,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const saved = (await res.json()) as PointageRecord;
      setFeuilles((m) => {
        const next = new Map(m);
        const savedJours = saved.jours as DbPointageJourJson[];
        next.set(matricule, {
          recordId: saved.id || null,
          verrouille: saved.verrouille,
          jours: joursToMap(savedJours),
          persistedDates: new Set(savedJours.map((j) => j.date)),
        });
        return next;
      });
      if (options?.notify !== false && options?.successMessage) {
        showSuccessAlert(options.successMessage);
      }
    } catch (e) {
      showErrorAlert(e instanceof Error ? e.message : "Erreur");
      throw e;
    } finally {
      setSavingCell(null);
    }
  }, [mois]);

  function paintPresentCell(matricule: string, date: string) {
    if (confirmingBulk) return;
    if (isFutureDay(date) || isWeekendDate(date)) return;
    const feuille = feuilles.get(matricule);
    if (!feuille || feuille.verrouille) return;
    const existing = feuille.jours.get(date);
    const filled = isPointageCellFilled(existing);
    const editable = canEditCell(matricule, date, filled);
    if (!editable || filled) return;

    const cellKey = paintCellKey(matricule, date);
    if (pendingBulkSave?.touchedCells.has(cellKey)) return;
    const session = dragPaintRef.current;
    if (session?.touchedCells.has(cellKey)) return;

    const snapshots = new Map(pendingBulkSave?.snapshots ?? []);
    for (const [m, snap] of session?.snapshots ?? []) {
      if (!snapshots.has(m)) snapshots.set(m, snap);
    }
    if (!snapshots.has(matricule)) {
      snapshots.set(matricule, new Map(feuille.jours));
    }

    setFeuilles((prev) => {
      const next = new Map(prev);
      const current = next.get(matricule);
      if (!current) return prev;
      const jours = new Map(current.jours);
      jours.set(date, defaultJourEntry(date));
      next.set(matricule, { ...current, jours });
      return next;
    });

    const touchedCells = new Set(session?.touchedCells ?? []);
    touchedCells.add(cellKey);
    dragPaintRef.current = { touchedCells, snapshots };
  }

  const endDragSelection = useCallback(() => {
    const state = dragPaintRef.current;
    dragPaintRef.current = null;
    if (!state || state.touchedCells.size === 0) return;

    setPendingBulkSave((prev) => {
      const touchedCells = new Set(prev?.touchedCells ?? []);
      for (const key of state.touchedCells) touchedCells.add(key);
      const snapshots = new Map(prev?.snapshots ?? []);
      for (const [matricule, snap] of state.snapshots) {
        if (!snapshots.has(matricule)) snapshots.set(matricule, snap);
      }
      return { touchedCells, snapshots };
    });
  }, []);

  const cancelBulkSave = useCallback(() => {
    const pending = pendingBulkSave;
    if (!pending) return;
    setFeuilles((prev) => {
      const next = new Map(prev);
      for (const [matricule, snapshotJours] of pending.snapshots) {
        const current = next.get(matricule);
        if (!current) continue;
        next.set(matricule, { ...current, jours: new Map(snapshotJours) });
      }
      return next;
    });
    setPendingBulkSave(null);
  }, [pendingBulkSave]);

  const pendingBulkSummary = useMemo(() => {
    if (!pendingBulkSave) return null;
    const matricules = new Set<string>();
    for (const key of pendingBulkSave.touchedCells) {
      matricules.add(parsePaintCellKey(key).matricule);
    }
    return {
      cellCount: pendingBulkSave.touchedCells.size,
      employeeCount: matricules.size,
    };
  }, [pendingBulkSave]);

  const confirmBulkSave = useCallback(async () => {
    const pending = pendingBulkSave;
    if (!pending) return;

    const byMatricule = new Map<string, Set<string>>();
    for (const key of pending.touchedCells) {
      const { matricule, date } = parsePaintCellKey(key);
      const dates = byMatricule.get(matricule) ?? new Set<string>();
      dates.add(date);
      byMatricule.set(matricule, dates);
    }

    setConfirmingBulk(true);
    try {
      await Promise.all(
        Array.from(byMatricule.entries()).map(([matricule]) => {
          const feuille = feuillesRef.current.get(matricule);
          if (!feuille) return Promise.resolve();
          return saveEmployeeDays(
            matricule,
            feuille.recordId,
            feuille.verrouille,
            feuille.jours,
            { notify: false }
          );
        })
      );
      const totalCells = pending.touchedCells.size;
      const totalEmployees = byMatricule.size;
      showSuccessAlert(
        totalEmployees > 1
          ? `${totalCells} jour${totalCells > 1 ? "s" : ""} Présent pour ${totalEmployees} employés`
          : totalCells > 1
            ? `${totalCells} jours marqués Présent`
            : "Jour marqué Présent"
      );
      setPendingBulkSave(null);
    } catch {
      // Message déjà géré dans saveEmployeeDays.
    } finally {
      setConfirmingBulk(false);
    }
  }, [pendingBulkSave, saveEmployeeDays]);

  useEffect(() => {
    function onGlobalMouseUp() {
      endDragSelection();
    }
    window.addEventListener("mouseup", onGlobalMouseUp);
    return () => window.removeEventListener("mouseup", onGlobalMouseUp);
  }, [endDragSelection]);

  const modalJour = cellTarget
    ? getJour(cellTarget.matricule, cellTarget.date) ?? draftJourEntryForNewCell(cellTarget.date)
    : null;

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <div className="shrink-0">
        <PageHeader compact title="Saisie pointage">
          <Link
            href={`/pointage/gestion?mois=${mois}`}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--shell-border)] px-3 py-1.5 text-sm hover:bg-[var(--shell-hover)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </PageHeader>

        <div className="mb-3 space-y-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/60 p-4">
          <PointagePeriodSelect
            basePath="/pointage/saisie"
            onRefresh={() => void loadData()}
            refreshing={loading}
          />
          {canReadSaisie && (
            <p className="text-xs text-[var(--shell-text-muted)]">
              Glisser sur plusieurs employés et semaines (hors samedi/dimanche) pour marquer Présent.
              Plusieurs glissers successifs s&apos;additionnent avant enregistrement. Jours futurs : vides et
              non saisissables. Jours passés sans donnée : vides et saisissables
              {canSaisir ? "" : " (permission « Saisir un jour vide » requise)"}. Modification d&apos;un
              jour enregistré
              {canModifier ? " : autorisée" : " : permission « Modifier un jour déjà enregistré » requise"}.
            </p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {loading ? (
          <Skeleton className="h-full min-h-[12rem] rounded-xl" />
        ) : visibleDays.length === 0 ? (
          <p className="py-12 text-center text-[var(--shell-text-muted)]">
            Aucun jour à afficher pour ce mois.
          </p>
        ) : (
          <div className="h-full overflow-x-hidden overflow-y-auto rounded-xl border border-[var(--shell-border)]">
            <table className="w-full table-fixed border-collapse text-[10px]">
              <colgroup>
                <col style={{ width: EMPLOYEE_COL }} />
                {visibleDays.map((date) => (
                  <col key={date} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-10 bg-[var(--shell-surface)]">
                <tr className="text-[var(--shell-text-muted)]">
                  <th
                    rowSpan={2}
                    className="border-b border-r border-[var(--shell-border)] bg-[var(--shell-surface)] px-2 py-1.5 text-left align-middle text-[10px] uppercase"
                  >
                    Employé
                  </th>
                  {weekGroups.map((w) => (
                    <th
                      key={w.value}
                      colSpan={w.dates.length}
                      className="border-b border-l border-[var(--shell-border)]/60 px-0.5 py-1 text-center text-[10px] font-semibold normal-case text-sky-400/90"
                    >
                      Semaine {w.value}
                    </th>
                  ))}
                </tr>
                <tr className="text-[var(--shell-text-muted)]">
                  {visibleDays.map((date) => {
                    const wi = weekdayIndex(date);
                    const future = isFutureDay(date);
                    return (
                      <th
                        key={date}
                        className={cn(
                          "border-b border-l border-[var(--shell-border)]/50 p-0 font-normal",
                          weekendHeaderClass(date),
                          future && "opacity-40"
                        )}
                        title={future ? `${date} — jour futur` : date}
                      >
                        <div className="flex h-7 flex-col items-center justify-center leading-none">
                          <span className="tabular-nums">{dayOfMonth(date)}</span>
                          <span className="text-[8px] opacity-80">{WEEKDAY_LETTERS[wi]}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {departments.map(({ dept, employees: deptEmps }) => {
                  const collapsed = collapsedDepts.has(dept);
                  return (
                    <Fragment key={dept}>
                      <tr className="bg-[var(--shell-surface)]/80">
                        <td
                          colSpan={visibleDays.length + 1}
                          className="border-t border-[var(--shell-border)] px-2 py-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => toggleDept(dept)}
                            className="flex w-full items-center gap-2 text-left text-xs font-semibold hover:text-sky-400"
                          >
                            {collapsed ? (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                            )}
                            {dept}
                            <span className="font-normal text-[var(--shell-text-muted)]">
                              ({deptEmps.length})
                            </span>
                          </button>
                        </td>
                      </tr>
                      {!collapsed &&
                        deptEmps.map((emp) => {
                          const feuille = feuilles.get(emp.matricule);
                          const locked = feuille?.verrouille ?? false;
                          const label = `${emp.prenom} ${emp.nom}`;
                          const resumeJours = feuille ? mapToJoursArray(feuille.jours) : [];
                          const resumeTitle = formatPointageResumeTooltip(resumeJours);
                          const resumeShort = formatPointageResumeShort(resumeJours);
                          return (
                            <tr key={emp.id} className="border-t border-[var(--shell-border)]/40">
                              <td className="border-r border-[var(--shell-border)]/60 bg-[var(--shell-bg)] px-2 py-1">
                                <div
                                  className="min-w-0 cursor-help"
                                  title={resumeTitle}
                                >
                                  <div className="truncate text-[11px] font-medium">{label}</div>
                                  <div className="truncate text-[9px] text-[var(--shell-text-muted)]">
                                    {emp.matricule}
                                  </div>
                                  {resumeShort !== "Aucune saisie" && (
                                    <div className="mt-0.5 truncate text-[8px] font-medium tabular-nums text-sky-400/90">
                                      {resumeShort}
                                    </div>
                                  )}
                                </div>
                              </td>
                              {visibleDays.map((date) => {
                                const jour = getJour(emp.matricule, date);
                                const filled = isPointageCellFilled(jour);
                                const future = isFutureDay(date);
                                const editable = canEditCell(emp.matricule, date, filled);
                                const cellKey = `${emp.matricule}-${date}`;
                                const isSaving = savingCell === cellKey;
                                const isWeekend = isWeekendDate(date);
                                const paintKey = paintCellKey(emp.matricule, date);
                                const isPendingPaint = pendingBulkSave?.touchedCells.has(paintKey);
                                const disabled =
                                  locked || isSaving || future || isWeekend || confirmingBulk;

                                return (
                                  <td
                                    key={date}
                                    className={cn(
                                      "border-l border-[var(--shell-border)]/30 p-0.5 align-middle",
                                      weekendCellClass(date),
                                      future && "opacity-35"
                                    )}
                                  >
                                    <button
                                      type="button"
                                      disabled={disabled}
                                      onMouseDown={(e) => {
                                        if (disabled || e.button !== 0) return;
                                        const jour = getJour(emp.matricule, date);
                                        const filled = isPointageCellFilled(jour);
                                        if (!filled && !isWeekend) {
                                          e.preventDefault();
                                          paintPresentCell(emp.matricule, date);
                                        }
                                      }}
                                      onMouseEnter={() => {
                                        if (!dragPaintRef.current) return;
                                        paintPresentCell(emp.matricule, date);
                                      }}
                                      onClick={() => {
                                        if (dragPaintRef.current) return;
                                        openCell(emp.matricule, label, date);
                                      }}
                                      className={cn(
                                        "flex h-6 w-full min-w-0 items-center justify-center rounded border text-[9px] font-semibold transition-colors",
                                        isPendingPaint && "ring-2 ring-sky-400/80",
                                        filled
                                          ? cn(
                                              statutBadgeClass(jour!.statut),
                                              "border-transparent",
                                              !editable && !future && "opacity-70"
                                            )
                                          : future
                                            ? "cursor-not-allowed border-transparent bg-transparent"
                                            : "border-dashed border-[var(--shell-border)] text-[var(--shell-text-muted)] hover:border-sky-500/50 hover:bg-sky-500/5",
                                        locked && "cursor-not-allowed opacity-50",
                                        isSaving && "animate-pulse"
                                      )}
                                      title={cellHoverTitle(jour, filled, date, future, editable)}
                                    >
                                      {filled && !future ? getPointageStatutShort(jour!.statut) : ""}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pendingBulkSave && pendingBulkSummary && (
        <div className="fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-500/40 bg-[var(--shell-bg)] px-4 py-3 shadow-xl">
            <p className="text-sm">
              <span className="font-medium">
                {pendingBulkSummary.cellCount} jour
                {pendingBulkSummary.cellCount > 1 ? "s" : ""} Présent
              </span>
              <span className="text-[var(--shell-text-muted)]">
                {" "}
                — {pendingBulkSummary.employeeCount} employé
                {pendingBulkSummary.employeeCount > 1 ? "s" : ""} (hors week-end). Glissez à nouveau pour
                ajouter.
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={confirmingBulk}
                onClick={cancelBulkSave}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--shell-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--shell-hover)] disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
                Annuler
              </button>
              <button
                type="button"
                disabled={confirmingBulk}
                onClick={() => void confirmBulkSave()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
              >
                {confirmingBulk ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {cellTarget && modalJour && (
        <PointageCellModal
          employeLabel={cellTarget.employeLabel}
          jour={modalJour}
          verrouille={feuilles.get(cellTarget.matricule)?.verrouille ?? false}
          readOnly={cellTarget.readOnly}
          onClose={() => setCellTarget(null)}
          onSave={(updated) => saveCell(cellTarget.matricule, updated)}
        />
      )}
    </div>
  );
}
