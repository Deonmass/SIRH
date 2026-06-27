"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FolderOpen,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Plus,
  Table2,
  Trash2,
  Upload,
  UserX,
} from "lucide-react";
import { EmployeeHeaderSearch } from "@/components/employes/EmployeeHeaderSearch";
import { EmployeeDossierModal } from "@/components/employees/EmployeeDossierModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusTabs } from "@/components/layout/StatusTabs";
import { Badge } from "@/components/ui/Badge";
import { useContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { STATUS_LABELS } from "@/lib/constants";
import { EMPLOYE_STATUT_ORDER } from "@/lib/repositories/employes/employe-statut";
import { GridCards } from "@/components/ui/Grid8";
import { EmployeeListContentSkeleton } from "@/components/ui/PageSkeletons";
import { computeDossierProgressPercent, computeDossierTabCompletions } from "@/lib/employee-dossier-completion";
import { computeEmployeeTotalEmployeeCost } from "@/lib/employee-total-cost";
import { runDeleteWithSweetAlert } from "@/lib/alerts";
import type { AppSettings, Employee, EmployeeStatus, JobPosition } from "@/lib/types";
import { useAppSettings } from "@/contexts/SettingsContext";
import { EmployeeKindBadge } from "@/components/employees/EmployeeKindFields";
import { employeeKindDetail } from "@/lib/employee-kind";
import { filterEmployeesBySearch } from "@/lib/employee-search";
import { EmployeeDisciplineListView } from "./EmployeeDisciplineListView";
import { EmployeeTableView } from "./EmployeeTableView";
import { buildDisciplineListRows, filterDisciplineRows } from "@/lib/discipline-list";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useAuth } from "@/contexts/AuthContext";
import type { DossierTabId } from "@/lib/employee-dossier";
import { cn } from "@/lib/utils";

const ALL_STATUS = "all";
const DISCIPLINE_TAB = "discipline";
const VIEW_STORAGE_KEY = "rh-employes-view-mode";
const INACTIVE_STATUSES: EmployeeStatus[] = ["suspendu", "sorti", "licencie"];
type ViewMode = "cards" | "table";

export function EmployeeListPage({
  employees: initialEmployees,
  settings,
  positions,
}: {
  employees: Employee[];
  settings: AppSettings;
  positions: JobPosition[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dossierId = searchParams.get("dossier");

  const [employees, setEmployees] = useState(initialEmployees);
  const [listLoading, setListLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [dossierInitialTab, setDossierInitialTab] = useState<DossierTabId>("profil");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const { open: openContextMenu, menuNode } = useContextMenu();
  const { can } = useAuth();
  const canDelete = can("employes.liste", "delete");
  const canWrite = can("employes.liste", "write");

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "cards" || stored === "table") setViewMode(stored);
  }, []);

  useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    fetch("/api/employees", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : initialEmployees))
      .then((data: Employee[]) => {
        if (!cancelled) setEmployees(Array.isArray(data) ? data : initialEmployees);
      })
      .catch(() => {
        if (!cancelled) setEmployees(initialEmployees);
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialEmployees]);

  useEffect(() => {
    if (!dossierId) return;
    const emp = employees.find((e) => e.id === dossierId);
    if (emp) setSelected(emp);
  }, [dossierId, employees]);

  function closeDossier() {
    setSelected(null);
    if (dossierId) router.replace("/employes", { scroll: false });
  }

  function openDossier(employee: Employee, tab?: DossierTabId) {
    setDossierInitialTab(tab ?? (isDisciplineView ? "discipline" : "profil"));
    setSelected(employee);
  }

  async function handleDeleteEmployee(employee: Employee) {
    const name = `${employee.prenom} ${employee.nom}`;
    const ok = await runDeleteWithSweetAlert(
      {
        title: "Supprimer cet employé ?",
        message: `${name} (${employee.matricule}) sera définitivement retiré. Cette action est irréversible.`,
        progressMessage: `Retrait de ${name}…`,
        successTitle: "Employé supprimé",
        successMessage: `${name} a été retiré de la liste.`,
      },
      () =>
        fetch(`/api/employees/${encodeURIComponent(employee.id)}`, {
          method: "DELETE",
        })
    );
    if (!ok) return;
    setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
    if (selected?.id === employee.id) closeDossier();
  }

  async function handleDeactivateEmployee(employee: Employee) {
    const name = `${employee.prenom} ${employee.nom}`;
    if (
      !window.confirm(
        `Désactiver ${name} ? L'employé passera au statut « Suspendu ».`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/employees/${encodeURIComponent(employee.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "suspendu" }),
    });
    if (!res.ok) {
      await showErrorAlert("Désactivation impossible", await readApiError(res));
      return;
    }
    const updated = (await res.json()) as Employee;
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (selected?.id === updated.id) setSelected(updated);
  }

  const buildMenuItems = (employee: Employee): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      {
        id: "open-dossier",
        label: "Ouvrir le dossier",
        icon: <FolderOpen className="h-4 w-4 shrink-0 opacity-80" />,
        onClick: () => openDossier(employee),
      },
    ];
    if (canWrite) {
      items.push({
        id: "edit",
        label: "Modifier l'employé",
        icon: <Pencil className="h-4 w-4 shrink-0 opacity-80" />,
        onClick: () => openDossier(employee, "profil"),
      });
      items.push({
        id: "deactivate",
        label: "Désactiver l'employé",
        icon: <UserX className="h-4 w-4 shrink-0 opacity-80" />,
        disabled: INACTIVE_STATUSES.includes(employee.status),
        onClick: () => void handleDeactivateEmployee(employee),
      });
    }
    if (canDelete) {
      items.push({
        id: "delete",
        label: "Supprimer employé",
        icon: <Trash2 className="h-4 w-4 shrink-0 opacity-80" />,
        danger: true,
        onClick: () => void handleDeleteEmployee(employee),
      });
    }
    return items;
  };

  function changeView(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  }

  const disciplineRows = useMemo(() => buildDisciplineListRows(employees), [employees]);

  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set(ALL_STATUS, employees.length);
    employees.forEach((e) => {
      counts.set(e.status, (counts.get(e.status) ?? 0) + 1);
    });
    const statusTabs = [
      { id: ALL_STATUS, label: "Tous", count: counts.get(ALL_STATUS) ?? 0 },
      ...[...EMPLOYE_STATUT_ORDER].map((s) => ({
        id: s,
        label: STATUS_LABELS[s].label,
        count: counts.get(s) ?? 0,
      })),
    ].filter((t) => t.id === ALL_STATUS || t.count > 0);

    return [
      ...statusTabs,
      {
        id: DISCIPLINE_TAB,
        label: "Discipline",
        count: disciplineRows.length,
      },
    ];
  }, [employees, disciplineRows.length]);

  const isDisciplineView = statusFilter === DISCIPLINE_TAB;

  const filtered = useMemo(() => {
    const byStatus =
      statusFilter === ALL_STATUS || isDisciplineView
        ? employees
        : employees.filter((e) => e.status === statusFilter);
    return filterEmployeesBySearch(byStatus, settings, searchQuery);
  }, [employees, settings, statusFilter, searchQuery, isDisciplineView]);

  const filteredDisciplineRows = useMemo(
    () => filterDisciplineRows(disciplineRows, searchQuery),
    [disciplineRows, searchQuery]
  );

  const positionById = useMemo(
    () => new Map(positions.map((p) => [p.id, p])),
    [positions]
  );

  return (
    <>
      <PageHeader
        title="Employés"
        description={`${employees.length} employé${employees.length !== 1 ? "s" : ""} — cartes ou tableau`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <EmployeeHeaderSearch
            query={searchQuery}
            open={searchOpen}
            onOpenChange={setSearchOpen}
            onQueryChange={setSearchQuery}
          />
          {!isDisciplineView && (
          <div
            className="inline-flex rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-1"
            role="group"
            aria-label="Mode d'affichage"
          >
            <button
              type="button"
              onClick={() => changeView("cards")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                viewMode === "cards"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
              )}
              title="Vue cartes"
            >
              <LayoutGrid className="h-4 w-4" />
              Cartes
            </button>
            <button
              type="button"
              onClick={() => changeView("table")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                viewMode === "table"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
              )}
              title="Vue tableau"
            >
              <Table2 className="h-4 w-4" />
              Tableau
            </button>
          </div>
          )}
          <PermissionGate section="employes.nouveau" action="write">
            <Link
              href="/import?tab=employes"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--shell-border)] px-4 py-2.5 text-sm font-medium text-[var(--shell-text)] hover:bg-[var(--shell-bg)]"
            >
              <Upload className="h-4 w-4" />
              Import Excel
            </Link>
            <Link
              href="/employes/nouveau"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Nouvel employé
            </Link>
          </PermissionGate>
        </div>
      </PageHeader>

      {listLoading ? (
        <EmployeeListContentSkeleton />
      ) : (
        <>
      <StatusTabs tabs={tabs} active={statusFilter} onChange={setStatusFilter} />

      <p className="mb-4 text-sm text-[var(--shell-text-muted)]">
        {isDisciplineView ? (
          <>
            {filteredDisciplineRows.length} sanction(s) — employés ayant reçu une mesure disciplinaire
            {searchQuery.trim() ? ` — recherche « ${searchQuery.trim()} »` : ""}
          </>
        ) : (
          <>
            {filtered.length} employé(s) — affichage{" "}
            {viewMode === "cards" ? "en cartes" : "en tableau"}
            {searchQuery.trim() ? ` — recherche « ${searchQuery.trim()} »` : ""}
          </>
        )}
      </p>

      {isDisciplineView ? (
        <EmployeeDisciplineListView
          rows={filteredDisciplineRows}
          onOpenEmployee={(id) => {
            const emp = employees.find((e) => e.id === id);
            if (emp) openDossier(emp);
          }}
        />
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-[var(--shell-text-muted)]">
          {searchQuery.trim()
            ? "Aucun employé ne correspond à cette recherche."
            : "Aucun employé pour ce statut."}
        </p>
      ) : viewMode === "cards" ? (
        <GridCards cols={5}>
          {filtered.map((e) => (
            <EmployeeGridCard
              key={e.id}
              employee={e}
              settings={settings}
              position={e.positionId ? positionById.get(e.positionId) : undefined}
              onOpen={() => openDossier(e)}
              onMenuClick={(ev) => openContextMenu(ev, buildMenuItems(e))}
            />
          ))}
        </GridCards>
      ) : (
        <EmployeeTableView
          employees={filtered}
          settings={settings}
          positions={positions}
          onOpen={(employee) => openDossier(employee)}
          onMenuClick={(ev, employee) => openContextMenu(ev, buildMenuItems(employee))}
        />
      )}
        </>
      )}

      {selected && (
        <EmployeeDossierModal
          employee={selected}
          settings={settings}
          initialTab={dossierInitialTab}
          onClose={closeDossier}
        />
      )}

      {menuNode}
    </>
  );
}

function EmployeeGridCard({
  employee: e,
  settings,
  position,
  onOpen,
  onMenuClick,
}: {
  employee: Employee;
  settings: AppSettings;
  position?: JobPosition;
  onOpen: () => void;
  onMenuClick: (e: React.MouseEvent) => void;
}) {
  const { formatSalary, convertAmount } = useAppSettings();
  const status = STATUS_LABELS[e.status];
  const { totalEmployee, currency } = computeEmployeeTotalEmployeeCost(
    e,
    settings,
    convertAmount,
    position
  );
  const dossierPct = computeDossierProgressPercent(computeDossierTabCompletions(e));
  const docsDone = e.documents.filter((d) => d.required && d.received).length;
  const docsReq = e.documents.filter((d) => d.required).length;

  return (
    <div className="group relative flex w-full cursor-pointer flex-col rounded-xl border border-[var(--shell-border)] bg-[var(--shell-popover)] transition hover:border-sky-500/40 hover:bg-[var(--shell-hover)] min-h-[152px]">
      <button
        type="button"
        aria-label="Actions employé"
        title="Actions"
        onClick={onMenuClick}
          className={cn(
            "absolute right-2 top-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg",
          "text-[var(--shell-text-muted)] transition hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]",
          "opacity-70 group-hover:opacity-100"
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="flex w-full cursor-pointer flex-col p-3.5 pr-10 text-left"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/25 to-indigo-600/25 text-sm font-bold text-sky-300">
          {e.prenom[0]}
          {e.nom[0]}
        </div>
        <p className="mt-2 text-[10px] font-mono text-[var(--shell-text-muted)] truncate">
          {e.matricule}
        </p>
        <p className="text-sm font-semibold text-[var(--shell-text)] truncate group-hover:text-sky-500">
          {e.prenom}
        </p>
        <p className="text-xs text-[var(--shell-text-muted)] truncate">{e.nom}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge className={`text-[10px] px-1.5 py-0 ${status.color} truncate max-w-full`}>
            {status.label}
          </Badge>
          <EmployeeKindBadge
            kind={e.employeeKind}
            detail={employeeKindDetail(e, settings)}
          />
        </div>
        <p className="mt-auto pt-3 text-[10px] text-[var(--shell-text-muted)] truncate">
          {e.department}
          {e.position ? ` · ${e.position}` : ""}
        </p>
        <div className="mt-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--shell-text-muted)]">
            Total employé
          </p>
          <p className="text-sm font-semibold tabular-nums text-sky-500">
            {formatSalary(totalEmployee, currency)}
          </p>
        </div>
      <p className="text-[10px] text-[var(--shell-text-muted)]">
        Dossier {dossierPct}% · Docs {docsDone}/{docsReq}
      </p>
      </button>
    </div>
  );
}
