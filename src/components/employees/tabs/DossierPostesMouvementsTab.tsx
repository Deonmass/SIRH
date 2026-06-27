"use client";

import { useEffect, useMemo, useState } from "react";
import { GitBranch, Loader2 } from "lucide-react";
import {
  DepartmentOrganigramModal,
  groupPositionsByDepartment,
} from "@/components/postes/DepartmentOrganigramCard";
import { attachEmployeeIds } from "@/lib/poste-linking";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SaveButton } from "@/components/ui/SaveButton";
import { FieldsTableView, HistoryCardsView, HistoryTableView } from "../DossierDataViews";
import {
  DossierField,
  DossierGrid,
  DossierSection,
  DossierSelect,
  DossierTextInput,
} from "../DossierFields";
import { DossierTabToolbar, type DossierSectionView } from "../DossierViewToggle";
import { STATUS_LABELS } from "@/lib/constants";
import { EMPLOYEE_KIND_LABELS } from "@/lib/employee-kind";
import { EMPLOYE_STATUT_ORDER } from "@/lib/repositories/employes/employe-statut";
import { getEmployeeDossier } from "@/lib/employee-dossier";
import { resolveEmployeeHireDate } from "@/lib/employee-seniority";
import type { AppSettings, Employee, EmployeeDossier, EmployeeStatus, JobPosition } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import type { MovementType } from "@/lib/types";

const MOVEMENT_TYPES: { value: MovementType; label: string }[] = [
  { value: "promotion", label: "Promotion" },
  { value: "mutation", label: "Mutation" },
  { value: "changement_poste", label: "Changement de poste" },
  { value: "augmentation", label: "Augmentation" },
  { value: "avenant_avantages", label: "Avenant avantages" },
  { value: "suspension", label: "Suspension" },
  { value: "reintegration", label: "Réintégration" },
  { value: "licenciement", label: "Licenciement" },
  { value: "demission", label: "Démission" },
  { value: "fin_cdd", label: "Fin CDD" },
];

function hireDateFromEmployee(employee: Employee): string | undefined {
  return resolveEmployeeHireDate(employee);
}

export function DossierPostesMouvementsTab({
  employee,
  settings,
  view,
  onViewChange,
  onPatch,
  onPatchDossier,
  showViewToggle = true,
}: {
  employee: Employee;
  settings: AppSettings;
  view: DossierSectionView;
  onViewChange: (v: DossierSectionView) => void;
  onPatch: (data: Partial<Employee>) => void;
  onPatchDossier: (p: Partial<EmployeeDossier>) => void;
  showViewToggle?: boolean;
}) {
  const dossier = getEmployeeDossier(employee);
  const status = STATUS_LABELS[employee.status];
  const [linkedPosition, setLinkedPosition] = useState<JobPosition | null>(null);
  const [superiorTitle, setSuperiorTitle] = useState<string | null>(null);
  const [loadingPosition, setLoadingPosition] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [organigramOpen, setOrganigramOpen] = useState(false);
  const [organigramLoading, setOrganigramLoading] = useState(false);
  const [organigramData, setOrganigramData] = useState<{
    department: string;
    positions: JobPosition[];
    allPositions: JobPosition[];
    employees: Employee[];
  } | null>(null);
  const [form, setForm] = useState({
    type: "promotion" as MovementType,
    reason: "",
    toPosition: employee.position ?? "",
    toDepartment: employee.department ?? "",
    toSalary: employee.salary.baseSalary ?? 0,
    effectiveDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!employee.positionId) {
      setLinkedPosition(null);
      setSuperiorTitle(null);
      return;
    }
    let cancelled = false;
    setLoadingPosition(true);
    fetch(`/api/postes/${encodeURIComponent(employee.positionId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(async (position: JobPosition | null) => {
        if (cancelled) return;
        setLinkedPosition(position);
        if (position?.reportsToId) {
          const parentRes = await fetch(
            `/api/postes/${encodeURIComponent(position.reportsToId)}`
          );
          const parent = parentRes.ok ? ((await parentRes.json()) as JobPosition) : null;
          if (!cancelled) setSuperiorTitle(parent?.title ?? null);
        } else {
          setSuperiorTitle(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPosition(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employee.positionId]);

  const posteInfo = useMemo(() => {
    const hireDate = hireDateFromEmployee(employee);
    return {
      position: linkedPosition?.title || employee.position || "—",
      department: linkedPosition?.department || employee.department || "—",
      grade: linkedPosition?.grade || employee.grade || "—",
      location: linkedPosition?.location || dossier.lieuAffectation || "—",
      superior: superiorTitle || dossier.superieurHierarchique || "—",
      hire: hireDate ? formatDate(hireDate) : "—",
      contract: String(linkedPosition?.contractType || employee.contractType || "—"),
    };
  }, [linkedPosition, employee, dossier, superiorTitle]);

  const displayValue = (v: string) => (v === "—" ? "" : v);

  const organigramDepartment =
    linkedPosition?.department?.trim() || employee.department?.trim() || null;

  const organigramEmpById = useMemo(
    () => new Map((organigramData?.employees ?? []).map((e) => [e.id, e])),
    [organigramData?.employees]
  );

  async function openOrganigramModal() {
    if (!organigramDepartment) return;
    setOrganigramLoading(true);
    try {
      const [posRes, empRes] = await Promise.all([
        fetch("/api/postes", { cache: "no-store" }),
        fetch("/api/employees", { cache: "no-store" }),
      ]);
      if (!posRes.ok || !empRes.ok) return;
      const positions = (await posRes.json()) as JobPosition[];
      const employees = (await empRes.json()) as Employee[];
      const linked = attachEmployeeIds(positions, employees);
      const deptPositions = groupPositionsByDepartment(linked).find(
        ([dept]) => dept === organigramDepartment
      )?.[1];
      if (!deptPositions?.length) return;
      setOrganigramData({
        department: organigramDepartment,
        positions: deptPositions,
        allPositions: linked,
        employees,
      });
      setOrganigramOpen(true);
    } finally {
      setOrganigramLoading(false);
    }
  }

  const posteRows = [
    { key: "position", label: "Poste / Fonction", value: posteInfo.position },
    { key: "dept", label: "Département", value: posteInfo.department },
    { key: "grade", label: "Grade", value: posteInfo.grade },
    { key: "lieu", label: "Lieu d'affectation", value: posteInfo.location },
    { key: "superieur", label: "Supérieur", value: posteInfo.superior },
    { key: "hire", label: "Embauche", value: posteInfo.hire },
    { key: "status", label: "Statut", value: <Badge className={status.color}>{status.label}</Badge> },
    { key: "contract", label: "Type contrat", value: posteInfo.contract },
    {
      key: "kind",
      label: "Type d'employé",
      value: employee.positionId ? EMPLOYEE_KIND_LABELS[employee.employeeKind] : "—",
    },
  ];

  async function saveMovement() {
    if (!form.reason.trim()) return;
    setLoading(true);
    const res = await fetch("/api/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: employee.id,
        type: form.type,
        reason: form.reason,
        toPosition: form.toPosition || undefined,
        toDepartment: form.toDepartment || undefined,
        toSalary: Number(form.toSalary) || undefined,
        effectiveDate: form.effectiveDate,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setShowMoveModal(false);
      window.location.reload();
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
        <DossierTabToolbar
          title="Poste actuel"
          description="Affectation et informations professionnelles"
          view={view}
          onViewChange={onViewChange}
          showViewToggle={showViewToggle}
          trailingActions={
            organigramDepartment ? (
              <button
                type="button"
                disabled={organigramLoading}
                onClick={() => void openOrganigramModal()}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-medium text-sky-500 hover:bg-sky-500/20 disabled:opacity-60"
              >
                {organigramLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <GitBranch className="h-3.5 w-3.5" />
                )}
                Voir dans l&apos;organigramme
              </button>
            ) : null
          }
        />
        {loadingPosition && (
          <div className="mb-2 space-y-2 rounded-xl border border-[var(--shell-border)] p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {!employee.positionId && !loadingPosition && (
          <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
            Aucune fiche de poste liée — affectez l&apos;employé via Mouvements.
          </p>
        )}
        {view === "cards" ? (
          <DossierSection title="">
            <DossierGrid>
              <DossierField label="Poste / Fonction">
                <DossierTextInput value={displayValue(posteInfo.position)} onChange={() => {}} readOnly />
              </DossierField>
              <DossierField label="Département">
                <DossierTextInput value={displayValue(posteInfo.department)} onChange={() => {}} readOnly />
              </DossierField>
              <DossierField label="Grade">
                <DossierTextInput value={displayValue(posteInfo.grade)} onChange={() => {}} readOnly />
              </DossierField>
              <DossierField label="Lieu d'affectation">
                <DossierTextInput value={displayValue(posteInfo.location)} onChange={() => {}} readOnly />
              </DossierField>
              <DossierField label="Supérieur hiérarchique">
                <DossierTextInput value={displayValue(posteInfo.superior)} onChange={() => {}} readOnly />
              </DossierField>
              <DossierField label="Date d'embauche">
                <DossierTextInput value={hireDateFromEmployee(employee) ?? ""} onChange={() => {}} readOnly />
              </DossierField>
              <DossierField label="Statut">
                <DossierSelect
                  value={employee.status}
                  onChange={(v) => onPatch({ status: v as EmployeeStatus })}
                  options={[...EMPLOYE_STATUT_ORDER].map((s) => ({
                    value: s,
                    label: STATUS_LABELS[s].label,
                  }))}
                />
              </DossierField>
              <DossierField label="Type contrat">
                <DossierTextInput value={displayValue(posteInfo.contract)} onChange={() => {}} readOnly />
              </DossierField>
            </DossierGrid>
          </DossierSection>
        ) : (
          <FieldsTableView rows={posteRows.map((r) => ({ ...r, value: r.value }))} />
        )}
        </div>

        <div>
        <DossierTabToolbar
          title="Historique des mouvements"
          description="Mutations, promotions, changements de poste"
          view={view}
          onViewChange={onViewChange}
          showViewToggle={showViewToggle}
        />
        <button
          type="button"
          onClick={() => setShowMoveModal(true)}
          className="mb-3 inline-block text-sm text-sky-500 hover:underline"
        >
          + Nouveau mouvement
        </button>
        {view === "cards" ? (
          <HistoryCardsView
            items={employee.movements}
            emptyMessage="Aucun mouvement enregistré."
            renderCard={(item) => {
              const m = item as Employee["movements"][0];
              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-[var(--shell-border)] border-l-4 border-l-sky-500 p-4"
                >
                  <p className="text-xs text-[var(--shell-text-muted)]">{formatDate(m.effectiveDate)}</p>
                  <p className="mt-1 font-medium capitalize">{m.type.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm">{m.reason}</p>
                  {m.fromPosition && m.toPosition && (
                    <p className="mt-2 text-xs text-[var(--shell-text-muted)]">
                      {m.fromPosition} → {m.toPosition}
                    </p>
                  )}
                </div>
              );
            }}
          />
        ) : (
          <HistoryTableView
            columns={[
              { key: "date", label: "Date" },
              { key: "type", label: "Type" },
              { key: "detail", label: "Détail" },
            ]}
            rows={employee.movements.map((m) => ({
              id: m.id,
              cells: [
                formatDate(m.effectiveDate),
                <span key="t" className="capitalize">{m.type.replace(/_/g, " ")}</span>,
                <>
                  {m.reason}
                  {m.fromPosition && m.toPosition && (
                    <span className="block text-xs text-[var(--shell-text-muted)]">
                      {m.fromPosition} → {m.toPosition}
                    </span>
                  )}
                </>,
              ],
            }))}
            emptyMessage="Aucun mouvement."
          />
        )}
        </div>
      </div>

      {organigramOpen && organigramData && (
        <DepartmentOrganigramModal
          elevated
          department={organigramData.department}
          positions={organigramData.positions}
          allPositions={organigramData.allPositions}
          employees={organigramData.employees}
          empById={organigramEmpById}
          onClose={() => setOrganigramOpen(false)}
          onPositionsChange={(next) =>
            setOrganigramData((prev) => {
              if (!prev) return prev;
              const deptPositions =
                groupPositionsByDepartment(next).find(([d]) => d === prev.department)?.[1] ??
                prev.positions;
              return {
                ...prev,
                allPositions: next,
                positions: deptPositions,
              };
            })
          }
        />
      )}

      {showMoveModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] p-5">
            <h3 className="mb-4 text-lg font-semibold">Nouveau mouvement</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-[var(--shell-text-muted)] sm:col-span-2">
                Type
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MovementType }))}
                  className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm"
                >
                  {MOVEMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-[var(--shell-text-muted)]">
                Nouveau poste
                <input className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm" value={form.toPosition} onChange={(e) => setForm((f) => ({ ...f, toPosition: e.target.value }))} />
              </label>
              <label className="text-xs text-[var(--shell-text-muted)]">
                Nouveau département
                <input className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm" value={form.toDepartment} onChange={(e) => setForm((f) => ({ ...f, toDepartment: e.target.value }))} />
              </label>
              <label className="text-xs text-[var(--shell-text-muted)]">
                Nouveau salaire
                <input type="number" className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm" value={form.toSalary} onChange={(e) => setForm((f) => ({ ...f, toSalary: Number(e.target.value) || 0 }))} />
              </label>
              <label className="text-xs text-[var(--shell-text-muted)]">
                Date d'effet
                <input type="date" className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} />
              </label>
              <label className="text-xs text-[var(--shell-text-muted)] sm:col-span-2">
                Motif
                <textarea className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm" rows={3} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowMoveModal(false)} className="rounded-lg border border-[var(--shell-border)] px-3 py-2 text-sm">Annuler</button>
              <SaveButton
                type="button"
                onClick={saveMovement}
                saving={loading}
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500"
              >
                Enregistrer
              </SaveButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
