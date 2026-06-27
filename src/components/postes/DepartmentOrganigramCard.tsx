"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Briefcase,
  CircleDashed,
  FileDown,
  FilePlus,
  FileSpreadsheet,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { runDeleteWithSweetAlert, showLoadingAlert } from "@/lib/alerts";
import { exportOrganigramExcel, exportOrganigramPdf } from "@/lib/organigram-export";
import {
  countFilledSlots,
  countVacantSlots,
  expandPositionSlots,
  remainingSlots,
} from "@/lib/poste-headcount";
import { PosteViewModal } from "@/components/postes/PosteViewModal";
import { AssignEmployeeToPosteModal } from "@/components/postes/AssignEmployeeToPosteModal";
import { UnassignEmployeeFromPosteModal } from "@/components/postes/UnassignEmployeeFromPosteModal";
import {
  clampContextMenuPosition,
  isPosteInactive,
  PostePositionContextMenu,
  type PostePositionMenuAction,
} from "@/components/postes/PostePositionContextMenu";
import { Badge } from "@/components/ui/Badge";
import { buildDeptOrgTree, type DeptOrgNode } from "@/lib/position-hierarchy";
import type { Employee, JobPosition } from "@/lib/types";
import { cn } from "@/lib/utils";

const ORG_ZOOM_MIN = 0.6;
const ORG_ZOOM_MAX = 1.5;
const ORG_ZOOM_STEP = 0.1;
const ORG_ZOOM_DEFAULT = 1;

function clampOrgZoom(value: number): number {
  return Math.min(ORG_ZOOM_MAX, Math.max(ORG_ZOOM_MIN, Math.round(value * 10) / 10));
}

function employeeInitials(employee: Employee): string {
  const a = employee.prenom?.trim().charAt(0) ?? "";
  const b = employee.nom?.trim().charAt(0) ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

function iconToneClass(sexe: Employee["sexe"]) {
  return sexe === "F" ? "family-org-node__icon--f" : "family-org-node__icon--m";
}

function DeptOrgBranch({
  node,
  employees,
  depth,
  nodeHandlers,
}: {
  node: DeptOrgNode;
  employees: Employee[];
  depth: number;
  nodeHandlers: (positionId: string, employeeId?: string) => {
    onSelect: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
  };
}) {
  const slots = expandPositionSlots(node.position, employees);
  const isRoot = depth === 0;

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          slots.length === 1
            ? "family-org__couple family-org__couple--solo"
            : "family-org__children",
          isRoot && slots.length > 1 && "family-org__children--head"
        )}
      >
        {slots.map((slot) => (
          <div key={slot.slotKey} className={slots.length > 1 ? "family-org__child-wrap" : undefined}>
            <PositionOrgNode
              position={slot.position}
              employee={slot.employee}
              roleLabel={node.position.grade}
              isHead={isRoot}
              {...nodeHandlers(slot.position.id, slot.employee?.id)}
            />
          </div>
        ))}
      </div>

      {node.children.length > 0 && (
        <>
          <div className="family-org__stem" aria-hidden />
          <div className="family-org__children">
            {node.children.map((child) => (
              <div key={child.position.id} className="family-org__child-wrap">
                <div className="family-org__child-connector" aria-hidden />
                <DeptOrgBranch
                  node={child}
                  employees={employees}
                  depth={depth + 1}
                  nodeHandlers={nodeHandlers}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PositionOrgNode({
  position,
  employee,
  roleLabel,
  isHead = false,
  onSelect,
  onContextMenu,
}: {
  position: JobPosition;
  employee?: Employee | null;
  roleLabel: string;
  isHead?: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const vacant = !employee;
  const inactive = isPosteInactive(position);

  if (vacant) {
    return (
      <button
        type="button"
        onClick={onSelect}
        onContextMenu={onContextMenu}
        className={cn(
          "family-org-node family-org-node--empty text-center transition hover:opacity-100",
          inactive && "opacity-60"
        )}
      >
        <div className="family-org-node__icon family-org-node__icon--empty">
          <Briefcase className="h-6 w-6 opacity-50" />
        </div>
        <p className="family-org-node__role w-full">{position.title}</p>
        <p className="family-org-node__age w-full truncate px-1 text-[var(--shell-text-muted)]">
          {roleLabel}
        </p>
        <Badge
          className={cn(
            "mt-1 text-[9px]",
            inactive
              ? "bg-slate-500/15 text-slate-500 border-slate-500/30"
              : "bg-amber-500/15 text-amber-500 border-amber-500/30"
          )}
        >
          {inactive ? "Inactif" : "Vacant"}
        </Badge>
      </button>
    );
  }

  const name = [employee.prenom, employee.postNom, employee.nom].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={cn(
        "family-org-node group text-center transition hover:opacity-100",
        isHead && "family-org-node--employee",
        inactive && "opacity-60"
      )}
    >
      <div className={cn("family-org-node__icon", iconToneClass(employee.sexe))}>
        <span className="text-sm font-bold leading-none">{employeeInitials(employee)}</span>
      </div>
      <p className="family-org-node__role w-full">{position.title}</p>
      <p className="family-org-node__name w-full">{name}</p>
      <p className="family-org-node__age w-full truncate px-1">{roleLabel}</p>
      {inactive && (
        <Badge className="mt-1 text-[9px] bg-slate-500/15 text-slate-500 border-slate-500/30">
          Inactif
        </Badge>
      )}
    </button>
  );
}

export function DepartmentOrganigramModal({
  department,
  positions,
  allPositions,
  employees,
  empById,
  onClose,
  onPositionsChange,
  elevated = false,
}: {
  department: string;
  positions: JobPosition[];
  allPositions: JobPosition[];
  employees: Employee[];
  empById: Map<string, Employee>;
  onClose: () => void;
  onPositionsChange?: (next: JobPosition[]) => void;
  /** Au-dessus d’un autre modal (ex. dossier employé). */
  elevated?: boolean;
}) {
  const router = useRouter();
  const [localEmployees, setLocalEmployees] = useState(employees);
  const orgTree = useMemo(() => buildDeptOrgTree(positions), [positions]);
  const filled = countFilledSlots(positions, localEmployees);
  const vacant = countVacantSlots(positions, localEmployees);
  const draft = positions.filter((p) => p.status === "draft").length;
  const [orgZoom, setOrgZoom] = useState(ORG_ZOOM_DEFAULT);
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    positionId: string;
    employeeId?: string;
  } | null>(null);
  const [assignPosition, setAssignPosition] = useState<JobPosition | null>(null);
  const [unassignTarget, setUnassignTarget] = useState<{
    position: JobPosition;
    employee: Employee;
  } | null>(null);

  useEffect(() => {
    setLocalEmployees(employees);
  }, [employees]);

  const localEmpById = useMemo(
    () => new Map(localEmployees.map((e) => [e.id, e])),
    [localEmployees]
  );

  const viewPosition = viewId ? allPositions.find((p) => p.id === viewId) : null;
  const menuPosition = menu ? allPositions.find((p) => p.id === menu.positionId) : null;
  const parentTitle = viewPosition?.reportsToId
    ? allPositions.find((p) => p.id === viewPosition.reportsToId)?.title
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

  function patchLocalPositions(updater: (list: JobPosition[]) => JobPosition[]) {
    onPositionsChange?.(updater(allPositions));
  }

  function openNode(positionId: string) {
    setViewId(positionId);
  }

  function openContextMenu(
    e: React.MouseEvent,
    positionId: string,
    employeeId?: string
  ) {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = clampContextMenuPosition(e.clientX, e.clientY);
    setMenu({ x, y, positionId, employeeId });
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
      patchLocalPositions((list) => list.filter((p) => p.id !== position.id));
      router.refresh();
    }
  }

  function handleEmployeeAssigned(employee: Employee) {
    setLocalEmployees((prev) => prev.map((e) => (e.id === employee.id ? employee : e)));
    patchLocalPositions((list) =>
      list.map((p) =>
        p.id === employee.positionId
          ? { ...p, employeeId: employee.id, status: p.status === "vacant" ? "active" : p.status }
          : p
      )
    );
    router.refresh();
  }

  function handleEmployeeUnassigned(employee: Employee, positionId: string) {
    setLocalEmployees((prev) => {
      const next = prev.map((e) => (e.id === employee.id ? employee : e));
      patchLocalPositions((list) =>
        list.map((p) => {
          if (p.id !== positionId) return p;
          const stillOccupied = next.some((e) => e.positionId === positionId);
          if (stillOccupied) return { ...p, employeeId: null };
          return {
            ...p,
            employeeId: null,
            status: p.status === "archived" || p.status === "draft" ? p.status : "vacant",
          };
        })
      );
      return next;
    });
    router.refresh();
  }

  function runMenuAction(action: PostePositionMenuAction, position: JobPosition) {
    if (action === "edit") {
      showLoadingAlert("Chargement de la fiche…", "Ouverture du formulaire de poste.");
      router.push(`/postes/nouvelle-fiche/${position.id}`);
    }
    else if (action === "assign") setAssignPosition(position);
    else if (action === "unassign") {
      const employeeId = menu?.employeeId ?? position.employeeId;
      const employee = employeeId ? localEmpById.get(employeeId) : undefined;
      if (employee) setUnassignTarget({ position, employee });
    } else if (action === "delete") void handleDelete(position);
  }

  function nodeHandlers(positionId: string, employeeId?: string) {
    return {
      onSelect: () => openNode(positionId),
      onContextMenu: (e: React.MouseEvent) => openContextMenu(e, positionId, employeeId),
    };
  }

  const legend = [
    {
      key: "total",
      label: "Postes",
      value: positions.length,
      dotClass: "bg-sky-500",
      icon: Briefcase,
    },
    {
      key: "filled",
      label: "Occupés",
      value: filled,
      dotClass: "bg-emerald-500",
      icon: Users,
    },
    {
      key: "vacant",
      label: "Vacants",
      value: vacant,
      dotClass: "bg-amber-500",
      icon: UserMinus,
    },
    ...(draft > 0
      ? [
          {
            key: "draft",
            label: "Brouillons",
            value: draft,
            dotClass: "bg-slate-400",
            icon: CircleDashed,
          },
        ]
      : []),
  ] as const;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  async function handleExportExcel() {
    setExporting("excel");
    try {
      await exportOrganigramExcel(department, positions, localEmpById);
    } finally {
      setExporting(null);
    }
  }

  async function handleExportPdf() {
    if (!exportRef.current) return;
    setExporting("pdf");
    try {
      await exportOrganigramPdf(exportRef.current, department);
    } finally {
      setExporting(null);
    }
  }

  function handleCreatePoste() {
    showLoadingAlert("Ouverture du formulaire…", `Nouvelle fiche — ${department}`);
    const params = new URLSearchParams({ department });
    onClose();
    router.push(`/postes/nouvelle-fiche?${params.toString()}`);
  }

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm",
        elevated ? "z-[70]" : "z-50"
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex max-h-[min(92vh,900px)] min-h-[min(92vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="dept-org-title"
        aria-busy={exporting !== null}
      >
        <div
          ref={exportRef}
          className="flex min-h-0 flex-1 flex-col"
          data-organigram-pdf-capture
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-[var(--shell-border)] px-6 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/25">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="dept-org-title" className="font-semibold text-[var(--shell-text)] truncate">
                {department}
              </h2>
              <p className="text-xs text-[var(--shell-text-muted)]">
                {positions.length} poste(s) · {filled + vacant} place(s) · {filled} occupée(s) ·{" "}
                {vacant} vacante(s) · Clic = visualiser · Clic droit = actions
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting !== null}
                className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] disabled:opacity-50"
                aria-label="Exporter en Excel"
                title="Exporter Excel (tableau + graphique)"
              >
                {exporting === "excel" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                )}
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exporting !== null}
                className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] disabled:opacity-50"
                aria-label="Exporter en PDF"
                title="Exporter PDF A4 paysage (1 page)"
              >
                {exporting === "pdf" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileDown className="h-5 w-5 text-rose-500" />
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={exporting !== null}
                className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] disabled:opacity-50"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
          <div
            className="family-org-panel mx-auto w-fit min-w-full origin-top transition-[zoom,transform] duration-150 ease-out"
            style={{ zoom: orgZoom }}
          >
            <div className="family-org">
              {orgTree ? (
                <DeptOrgBranch
                  node={orgTree}
                  employees={localEmployees}
                  depth={0}
                  nodeHandlers={nodeHandlers}
                />
              ) : (
                <p className="text-center text-xs text-[var(--shell-text-muted)]">
                  Aucun poste dans ce département
                </p>
              )}
            </div>
          </div>
          </div>

          <footer
            className="mt-auto shrink-0 border-t border-[var(--shell-border)] bg-[var(--shell-surface)]/60 px-6 py-3"
            aria-label="Légende et actions de l'organigramme"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
                  Légende
                </p>
                <div className="flex flex-wrap gap-2">
                  {legend.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.key}
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-card)] px-3 py-1.5"
                      >
                        <span
                          className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.dotClass)}
                          aria-hidden
                        />
                        <Icon className="h-3.5 w-3.5 text-[var(--shell-text-muted)]" />
                        <span className="text-xs text-[var(--shell-text-muted)]">{item.label}</span>
                        <span className="text-sm font-bold tabular-nums text-[var(--shell-text)]">
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-end justify-end gap-3 self-end">
                <div className="inline-flex items-center rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-1">
                    <button
                      type="button"
                      onClick={() => setOrgZoom((z) => clampOrgZoom(z - ORG_ZOOM_STEP))}
                      disabled={exporting !== null || orgZoom <= ORG_ZOOM_MIN}
                      className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] disabled:opacity-40"
                      aria-label="Réduire l'organigramme"
                      title="Zoom arrière"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[3.25rem] px-2 text-center text-sm font-semibold tabular-nums text-[var(--shell-text)]">
                      {Math.round(orgZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setOrgZoom((z) => clampOrgZoom(z + ORG_ZOOM_STEP))}
                      disabled={exporting !== null || orgZoom >= ORG_ZOOM_MAX}
                      className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] disabled:opacity-40"
                      aria-label="Agrandir l'organigramme"
                      title="Zoom avant"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrgZoom(ORG_ZOOM_DEFAULT)}
                      disabled={exporting !== null || orgZoom === ORG_ZOOM_DEFAULT}
                      className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] disabled:opacity-40"
                      aria-label="Réinitialiser le zoom"
                      title="Réinitialiser le zoom"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                <button
                  type="button"
                  onClick={handleCreatePoste}
                  disabled={exporting !== null}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  <FilePlus className="h-4 w-4" />
                  Nouveau poste
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {menu && menuPosition && (
        <PostePositionContextMenu
          menu={menu}
          position={menuPosition}
          isVacant={remainingSlots(menuPosition, localEmployees) > 0}
          isOccupied={Boolean(menu.employeeId && localEmpById.get(menu.employeeId))}
          onAction={(action) => runMenuAction(action, menuPosition)}
          onClose={closeMenu}
        />
      )}

      {assignPosition && (
        <AssignEmployeeToPosteModal
          elevated={elevated}
          position={assignPosition}
          employees={localEmployees}
          onClose={() => setAssignPosition(null)}
          onAssigned={handleEmployeeAssigned}
        />
      )}

      {unassignTarget && (
        <UnassignEmployeeFromPosteModal
          elevated={elevated}
          position={unassignTarget.position}
          employee={unassignTarget.employee}
          onClose={() => setUnassignTarget(null)}
          onUnassigned={(employee) => {
            handleEmployeeUnassigned(employee, unassignTarget.position.id);
            setUnassignTarget(null);
          }}
        />
      )}

      {viewPosition && (
        <PosteViewModal
          position={viewPosition}
          employees={localEmployees}
          parentTitle={parentTitle}
          onClose={() => setViewId(null)}
        />
      )}
    </div>
  );
}

export function groupPositionsByDepartment(positions: JobPosition[]) {
  const map = new Map<string, JobPosition[]>();
  for (const p of positions) {
    const list = map.get(p.department) ?? [];
    list.push(p);
    map.set(p.department, list);
  }

  return [...map.entries()].sort(([a], [b]) => {
    if (a === "Direction Générale") return -1;
    if (b === "Direction Générale") return 1;
    return a.localeCompare(b, "fr");
  });
}

export const DEPT_CARD_TONES = [
  "indigo",
  "sky",
  "cyan",
  "violet",
  "emerald",
  "amber",
  "rose",
  "orange",
] as const;
