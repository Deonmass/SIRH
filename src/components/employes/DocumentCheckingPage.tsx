"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  FileCheck,
  FileWarning,
  LayoutGrid,
  Search,
  Table2,
  Users,
} from "lucide-react";
import { EmployeeDossierModal } from "@/components/employees/EmployeeDossierModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyTable, StickyThead, Td, Th } from "@/components/layout/StickyTable";
import { GridStat, GridStatsRow } from "@/components/ui/Grid8";
import { CheckingDocumentsContentSkeleton } from "@/components/ui/PageSkeletons";
import { dossierCompletionTextClass } from "@/lib/employee-dossier-completion";
import { employeesDocumentCompletionList } from "@/lib/document-compliance";
import type { AppSettings, Employee } from "@/lib/types";
import type { DossierTabId } from "@/lib/employee-dossier";
import { cn } from "@/lib/utils";

type CompletionFilter = "incomplet" | "complet";
type ViewMode = "cards" | "table";

const VIEW_STORAGE_KEY = "rh-checking-documents-view";

function percentBarClass(percent: number) {
  if (percent <= 0) return "bg-red-500";
  if (percent >= 100 || percent >= 80) return "bg-emerald-500";
  if (percent >= 40) return "bg-amber-500";
  return "bg-slate-500";
}

function documentCardStyle(percent: number): React.CSSProperties {
  const t = Math.min(100, Math.max(0, percent)) / 100;
  // 0 % rouge → 50 % ambre → 100 % vert
  let hue: number;
  if (t <= 0.5) {
    hue = 0 + 38 * (t / 0.5);
  } else {
    hue = 38 + (142 - 38) * ((t - 0.5) / 0.5);
  }
  const sat = 55 + 10 * t;
  const light = 14 + 8 * t;
  return {
    backgroundColor: `hsla(${hue}, ${sat}%, ${light}%, 0.45)`,
    borderColor: `hsla(${hue}, ${sat + 6}%, ${light + 16}%, 0.55)`,
  };
}

function percentTextClass(percent: number) {
  if (percent <= 0) return "text-red-400";
  return dossierCompletionTextClass(percent);
}

function DocumentCompletionCard({
  employee,
  percent,
  onOpen,
}: {
  employee: Employee;
  percent: number;
  onOpen: () => void;
}) {
  const poste = employee.position?.trim() || employee.department || "—";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex w-full max-w-[9.5rem] cursor-pointer flex-col items-center rounded-xl border p-3 text-center",
        "min-h-[7.5rem] hover:shadow-md hover:shadow-black/20"
      )}
      style={documentCardStyle(percent)}
    >
      <div className="flex flex-1 items-center justify-center py-1">
        <span className={cn("text-3xl font-bold tabular-nums tracking-tight", percentTextClass(percent))}>
          {percent}%
        </span>
      </div>
      <div className="mt-auto w-full space-y-0.5 border-t border-white/10 pt-2">
        <p className="truncate text-[11px] font-medium text-[var(--shell-text)]">
          {employee.prenom} {employee.nom}
        </p>
        <p className="truncate text-[10px] text-[var(--shell-text-muted)]">{poste}</p>
        <p className="truncate font-mono text-[9px] text-[var(--shell-text-muted)]">{employee.matricule}</p>
      </div>
    </button>
  );
}

const COMPLETION_TABS: { id: CompletionFilter; label: string }[] = [
  { id: "incomplet", label: "Incomplets" },
  { id: "complet", label: "Complets" },
];

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div
      className="inline-flex shrink-0 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-0.5"
      role="group"
      aria-label="Mode d'affichage"
    >
      <button
        type="button"
        onClick={() => onChange("cards")}
        title="Vue cartes"
        aria-pressed={value === "cards"}
        className={cn(
          "flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition",
          value === "cards"
            ? "bg-sky-600 text-white shadow-sm"
            : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        title="Vue tableau"
        aria-pressed={value === "table"}
        className={cn(
          "flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition",
          value === "table"
            ? "bg-sky-600 text-white shadow-sm"
            : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
        )}
      >
        <Table2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DocumentCompletionTable({
  rows,
  onOpen,
}: {
  rows: ReturnType<typeof employeesDocumentCompletionList>;
  onOpen: (employee: Employee) => void;
}) {
  return (
    <StickyTable>
      <StickyThead>
        <tr>
          <Th>Employé</Th>
          <Th>Poste</Th>
          <Th>Matricule</Th>
          <Th>Documents reçus</Th>
          <Th className="min-w-[10rem]">Documents</Th>
        </tr>
      </StickyThead>
      <tbody>
        {rows.map((row) => {
          const { employee, percent, filledCount, requiredCount } = row;
          const poste = employee.position?.trim() || employee.department || "—";
          return (
            <tr
              key={employee.id}
              className="cursor-pointer hover:bg-[var(--shell-hover)]"
              onClick={() => onOpen(employee)}
            >
              <Td>
                <p className="font-medium text-[var(--shell-text)]">
                  {employee.prenom} {employee.nom}
                </p>
              </Td>
              <Td className="text-[var(--shell-text-muted)]">{poste}</Td>
              <Td>
                <span className="font-mono text-xs text-[var(--shell-text-muted)]">
                  {employee.matricule}
                </span>
              </Td>
              <Td className="tabular-nums text-sm">
                {filledCount}/{requiredCount}
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--shell-surface)]">
                    <div
                      className={cn("h-full rounded-full", percentBarClass(percent))}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className={cn("w-10 text-right text-sm font-bold tabular-nums", percentTextClass(percent))}>
                    {percent}%
                  </span>
                </div>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </StickyTable>
  );
}

function CompletionTabBar({
  active,
  onChange,
  counts,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: {
  active: CompletionFilter;
  onChange: (tab: CompletionFilter) => void;
  counts: { incomplet: number; complet: number };
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="-mx-8 border-b border-[var(--shell-border)]">
      <div className="flex flex-col gap-3 px-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-0.5 pt-1" role="tablist" aria-label="Filtrer par complétude">
          {COMPLETION_TABS.map((tab) => {
            const isActive = active === tab.id;
            const count = tab.id === "incomplet" ? counts.incomplet : counts.complet;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.id)}
                className={cn(
                  "relative cursor-pointer px-4 py-2.5 text-sm font-medium",
                  isActive
                    ? "-mb-px z-10 rounded-t-lg border border-b-0 border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--shell-text)]"
                    : "mb-0 text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
                )}
              >
                {tab.label}
                <span className="ml-1.5 tabular-nums text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex w-full items-center gap-2 pb-2 sm:ml-auto sm:w-auto">
          <label className="relative flex min-w-0 flex-1 items-center sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--shell-text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher…"
              className="input w-full py-2 pl-9 pr-3"
            />
          </label>
          <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
        </div>
      </div>
    </div>
  );
}

export function DocumentCheckingPage({
  employees: initialEmployees,
  settings,
}: {
  employees: Employee[];
  settings: AppSettings;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dossierId = searchParams.get("dossier");
  const tabParam = searchParams.get("tab") as DossierTabId | null;

  const [employees, setEmployees] = useState(initialEmployees);
  const [listLoading, setListLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [completionTab, setCompletionTab] = useState<CompletionFilter>("incomplet");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selected, setSelected] = useState<Employee | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "cards" || stored === "table") setViewMode(stored);
  }, []);

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  }

  const refreshEmployees = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/employees", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as Employee[];
        if (Array.isArray(data)) setEmployees(data);
      }
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  useEffect(() => {
    void refreshEmployees();
  }, [refreshEmployees]);

  const rows = useMemo(() => employeesDocumentCompletionList(employees), [employees]);

  const completeRows = useMemo(() => rows.filter((r) => r.percent >= 100), [rows]);
  const incompleteRows = useMemo(() => rows.filter((r) => r.percent < 100), [rows]);

  const filtered = useMemo(() => {
    const base = completionTab === "complet" ? completeRows : incompleteRows;
    const q = filter.trim().toLowerCase();
    if (!q) return base;
    return base.filter(({ employee }) => {
      const haystack =
        `${employee.prenom} ${employee.nom} ${employee.matricule} ${employee.department} ${employee.position ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [completeRows, incompleteRows, completionTab, filter]);

  const stats = useMemo(() => {
    const incomplete = incompleteRows.length;
    const avg =
      rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + r.percent, 0) / rows.length)
        : 100;
    return {
      total: rows.length,
      incomplete,
      complete: completeRows.length,
      avg,
    };
  }, [rows, incompleteRows.length, completeRows.length]);

  useEffect(() => {
    if (!dossierId) return;
    const emp = employees.find((e) => e.id === dossierId);
    if (emp) setSelected(emp);
  }, [dossierId, employees, tabParam]);

  function openDossier(employee: Employee) {
    setSelected(employee);
    const params = new URLSearchParams({ dossier: employee.id, tab: "documents" });
    router.replace(`/employes/checking-documents?${params.toString()}`, { scroll: false });
  }

  function closeDossier() {
    setSelected(null);
    router.replace("/employes/checking-documents", { scroll: false });
    void refreshEmployees();
  }

  return (
    <>
      <PageHeader
        title="Checking document"
        description="Complétude documentaire par employé (documents obligatoires reçus) — du moins au plus complet"
      />

      <GridStatsRow className="mb-6">
        <GridStat tone="sky" icon={Users} label="Employés analysés" value={stats.total} />
        <GridStat
          tone="rose"
          icon={FileWarning}
          label="Dossiers incomplets"
          value={stats.incomplete}
        />
        <GridStat
          tone="emerald"
          icon={FileCheck}
          label="Dossiers complets"
          value={stats.complete}
        />
        <GridStat
          tone="amber"
          icon={AlertTriangle}
          label="Complétude moyenne"
          value={`${stats.avg}%`}
        />
      </GridStatsRow>

      <CompletionTabBar
        active={completionTab}
        onChange={setCompletionTab}
        counts={{ incomplet: stats.incomplete, complet: stats.complete }}
        search={filter}
        onSearchChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={changeViewMode}
      />

      {listLoading ? (
        <div className="mt-4">
          <CheckingDocumentsContentSkeleton viewMode={viewMode} />
        </div>
      ) : (
      <div className="mt-4">
        {filtered.length > 0 ? (
          viewMode === "cards" ? (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(9.5rem,9.5rem))]">
              {filtered.map((row) => (
                <DocumentCompletionCard
                  key={row.employee.id}
                  employee={row.employee}
                  percent={row.percent}
                  onOpen={() => openDossier(row.employee)}
                />
              ))}
            </div>
          ) : (
            <DocumentCompletionTable rows={filtered} onOpen={openDossier} />
          )
        ) : (
          <p className="py-12 text-center text-sm text-[var(--shell-text-muted)]">
            {rows.length === 0
              ? "Aucun employé actif à analyser."
              : completionTab === "complet"
                ? "Aucun dossier complet pour cette recherche."
                : "Aucun dossier incomplet pour cette recherche."}
          </p>
        )}
      </div>
      )}

      {selected && (
        <EmployeeDossierModal
          employee={selected}
          settings={settings}
          initialTab="documents"
          onClose={closeDossier}
        />
      )}
    </>
  );
}
