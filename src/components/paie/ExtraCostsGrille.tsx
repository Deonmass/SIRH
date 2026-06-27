"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { employeeDossierHref } from "@/lib/employee-dossier-url";
import { Banknote, Briefcase, Loader2, Save, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyTable, StickyThead, Td, Th } from "@/components/layout/StickyTable";
import { Card, CardContent } from "@/components/ui/Card";
import { SaveButton } from "@/components/ui/SaveButton";
import { useAppSettings } from "@/contexts/SettingsContext";
import {
  countChargeDependents,
  mergePayrollWithEmployeeDependents,
} from "@/lib/payroll-simulator-config";
import { readApiError, showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import {
  employeeDisplayName,
  EXTRA_COST_LABELS,
  totalExtraCosts,
} from "@/lib/extra-costs";
import { PayrollSummaryCard } from "@/components/payroll/PayrollSummaryCard";
import { calculatePayroll } from "@/lib/payroll";
import { resolveWorkMonthMode } from "@/lib/work-month-mode";
import {
  formatRemainingSlotsLabel,
  remainingSlots,
} from "@/lib/poste-headcount";
import {
  assignablePositionsForEmployee,
  jobPositionPayrollOptions,
  jobPositionToSalaryPackage,
} from "@/lib/postes";
import type {
  AppSettings,
  Currency,
  Employee,
  EmployeeExtraCosts,
  JobPosition,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Row = {
  employee: Employee;
  costs: EmployeeExtraCosts;
  dirty: boolean;
};

function costsKey(c: EmployeeExtraCosts) {
  return `${c.housing}|${c.mileage}|${c.childrenEducation}|${c.travel}|${c.variables}|${c.currency}`;
}

function currentSalaryFromPost(
  employee: Employee,
  position: JobPosition | undefined,
  settings: AppSettings
): { net: number; currency: Currency; postTitle: string | null } {
  if (position?.payroll) {
    const pkg = jobPositionToSalaryPackage(position.payroll);
    const payroll = calculatePayroll(
      pkg,
      settings,
      position.payroll.otherDeductions ?? 0,
      {
        ...jobPositionPayrollOptions(position.payroll, settings.smigBareme ?? []),
        dependents:
          position.payroll.dependents ??
          countChargeDependents(employee.family),
        overtime: employee.overtime,
        workMonthMode: resolveWorkMonthMode(employee, settings),
      }
    );
    return {
      net: Math.round(payroll.netSalary),
      currency: position.payroll.currency,
      postTitle: position.title,
    };
  }
  const payroll = calculatePayroll(employee.salary, settings, 0, {
    dependents: countChargeDependents(employee.family),
    overtime: employee.overtime,
    workMonthMode: resolveWorkMonthMode(employee, settings),
  });
  return {
    net: Math.round(payroll.netSalary),
    currency: employee.salary.currency,
    postTitle: null,
  };
}

export function ExtraCostsGrille({
  initialEmployees,
  initialPositions,
  title = "Grille des coûts extra",
  description = "Indemnités et frais mensuels par agent",
  showAffectationLink = true,
}: {
  initialEmployees: Employee[];
  initialPositions: JobPosition[];
  title?: string;
  description?: string;
  showAffectationLink?: boolean;
}) {
  const { formatSalary, settings } = useAppSettings();
  const positionById = useMemo(
    () => new Map(initialPositions.map((p) => [p.id, p])),
    [initialPositions]
  );
  const [rows, setRows] = useState<Row[]>(() =>
    initialEmployees.map((e) => ({
      employee: e,
      costs: { ...e.extraCosts! },
      dirty: false,
    }))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = employeeDisplayName(r.employee).toLowerCase();
      return (
        name.includes(q) ||
        r.employee.matricule.toLowerCase().includes(q) ||
        r.employee.department.toLowerCase().includes(q)
      );
    });
  }, [rows, filter]);

  const grandTotal = useMemo(
    () => filtered.reduce((s, r) => s + totalExtraCosts(r.costs), 0),
    [filtered]
  );

  const updateCost = useCallback(
    (employeeId: string, field: keyof EmployeeExtraCosts, value: number | string) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.employee.id !== employeeId) return r;
          const costs = { ...r.costs, [field]: value };
          const dirty = costsKey(costs) !== costsKey(r.employee.extraCosts!);
          return { ...r, costs, dirty };
        })
      );
    },
    []
  );

  async function saveRow(employeeId: string) {
    const row = rows.find((r) => r.employee.id === employeeId);
    if (!row) return;
    setSavingId(employeeId);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraCosts: row.costs }),
      });
      if (!res.ok) {
        await showErrorAlert("Enregistrement impossible", await readApiError(res));
        return;
      }
      const updated = (await res.json()) as Employee;
      setRows((prev) =>
        prev.map((r) =>
          r.employee.id === employeeId
            ? { employee: updated, costs: { ...updated.extraCosts! }, dirty: false }
            : r
        )
      );
    } catch (err) {
      await showErrorAlert(
        "Erreur réseau",
        err instanceof Error ? err.message : "Impossible de contacter le serveur."
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <PageHeader title={title} description={description}>
        <div className="flex flex-wrap gap-2">
          {showAffectationLink && (
            <Link
              href="/mouvements"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Mouvements & postes
            </Link>
          )}
          <Link
            href="/employes/nouveau"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Ajouter un employé
          </Link>
        </div>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrer par agent, matricule, département…"
          className="w-full max-w-md flex-1 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2 text-sm text-[var(--shell-text)]"
        />
        <p className="shrink-0 text-sm font-semibold text-[var(--shell-text)]">
          Total affiché :{" "}
          <span className="tabular-nums text-amber-600 dark:text-amber-300">
            {formatSalary(grandTotal, "USD")}
          </span>
        </p>
      </div>

      <StickyTable>
        <StickyThead>
          <tr>
            <Th className="w-10">#</Th>
            <Th>Agent</Th>
            <Th>
              <span className="inline-flex items-center gap-1">
                <Banknote className="h-3 w-3" />
                {EXTRA_COST_LABELS.housing}
              </span>
            </Th>
            <Th>
              <span className="inline-flex items-center gap-1">
                <Banknote className="h-3 w-3" />
                {EXTRA_COST_LABELS.mileage}
              </span>
            </Th>
            <Th>
              <span className="inline-flex items-center gap-1">
                <Banknote className="h-3 w-3" />
                {EXTRA_COST_LABELS.childrenEducation}
              </span>
            </Th>
            <Th>
              <span className="inline-flex items-center gap-1">
                <Banknote className="h-3 w-3" />
                {EXTRA_COST_LABELS.travel}
              </span>
            </Th>
            <Th>
              <span className="inline-flex items-center gap-1">
                <Banknote className="h-3 w-3" />
                {EXTRA_COST_LABELS.variables}
              </span>
            </Th>
            <Th>Total</Th>
            <Th className="w-24"> </Th>
          </tr>
        </StickyThead>
        <tbody>
          {filtered.map((row, index) => {
            const total = totalExtraCosts(row.costs);
            const position = row.employee.positionId
              ? positionById.get(row.employee.positionId)
              : undefined;
            const salaryChip = currentSalaryFromPost(row.employee, position, settings);
            return (
              <tr
                key={row.employee.id}
                className="border-b border-[var(--shell-border)]/60 hover:bg-[var(--shell-hover)]"
              >
                <Td className="text-[var(--shell-text-muted)]">{index + 1}</Td>
                <Td>
                  <p className="font-medium text-[var(--shell-text)]">
                    {employeeDisplayName(row.employee)}
                  </p>
                  <p className="text-[10px] text-[var(--shell-text-muted)]">
                    {row.employee.matricule}
                  </p>
                  <span
                    className={cn(
                      "mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      salaryChip.postTitle
                        ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                        : "bg-[var(--shell-surface)] text-[var(--shell-text-muted)]"
                    )}
                    title={
                      salaryChip.postTitle
                        ? `Salaire du poste : ${salaryChip.postTitle}`
                        : "Aucun poste lié — salaire fiche employé"
                    }
                  >
                    <Briefcase className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {salaryChip.postTitle ? salaryChip.postTitle : "Sans poste"} ·{" "}
                      {formatSalary(salaryChip.net, salaryChip.currency)}
                    </span>
                  </span>
                </Td>
                {(
                  [
                    "housing",
                    "mileage",
                    "childrenEducation",
                    "travel",
                    "variables",
                  ] as const
                ).map((field) => (
                  <Td key={field}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.costs[field] || ""}
                      onChange={(e) =>
                        updateCost(row.employee.id, field, Number(e.target.value) || 0)
                      }
                      className="w-full min-w-[5rem] rounded border border-white/10 bg-black/40 px-2 py-1 text-sm text-white"
                    />
                  </Td>
                ))}
                <Td className="font-semibold text-amber-300 whitespace-nowrap">
                  {formatSalary(total, row.costs.currency)}
                </Td>
                <Td>
                  {row.dirty && (
                    <button
                      type="button"
                      onClick={() => void saveRow(row.employee.id)}
                      disabled={savingId === row.employee.id}
                      className="inline-flex items-center gap-1 rounded bg-sky-600/80 px-2 py-1 text-[10px] text-white disabled:opacity-50"
                    >
                      {savingId === row.employee.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      OK
                    </button>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </StickyTable>

      {filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-slate-500">
          Aucun employé.{" "}
          <Link href="/employes/nouveau" className="text-sky-400 hover:underline">
            Ajouter un employé
          </Link>
        </p>
      )}
    </>
  );
}

const ACTIVE_STATUSES = ["actif", "essai", "conge", "preavis", "pre_embauche", "candidat"] as const;

function AffectationForm({
  emp,
  positions,
  employees,
  saving,
  onSave,
}: {
  emp: Employee;
  positions: JobPosition[];
  employees: Employee[];
  saving: boolean;
  onSave: (
    id: string,
    payload: { positionId: string; extraCosts: EmployeeExtraCosts }
  ) => Promise<boolean>;
}) {
  const assignable = assignablePositionsForEmployee(positions, emp, employees);
  const [draftPositionId, setDraftPositionId] = useState("");
  const [draftCosts, setDraftCosts] = useState<EmployeeExtraCosts>(() => ({
    ...emp.extraCosts!,
  }));
  const selectedPosition = positions.find((p) => p.id === draftPositionId);

  useEffect(() => {
    setDraftPositionId(emp.positionId ?? "");
    setDraftCosts({ ...emp.extraCosts! });
  }, [emp.id, emp.positionId, emp.updatedAt, emp.extraCosts]);

  const dirty =
    draftPositionId !== (emp.positionId ?? "") ||
    costsKey(draftCosts) !== costsKey(emp.extraCosts!);

  const canSave = dirty && draftPositionId.length > 0 && !saving;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{employeeDisplayName(emp)}</h3>
          <p className="text-xs text-slate-500">
            {emp.matricule} · {emp.department}
            {emp.position ? ` · ${emp.position}` : ""}
          </p>
        </div>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-sky-400" />}
      </div>

      <label className="block text-xs text-slate-400">
        Fiche de poste (affectation)
        <select
          value={draftPositionId}
          disabled={saving}
          onChange={(e) => setDraftPositionId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          <option value="">— Choisir un poste vacant —</option>
          {assignable.map((p) => {
            const remaining = formatRemainingSlotsLabel(remainingSlots(p, employees));
            return (
              <option key={p.id} value={p.id}>
                {p.code} — {p.title} ({p.department})
                {remaining ? ` · ${remaining}` : ""}
              </option>
            );
          })}
        </select>
        {assignable.length === 0 && (
          <p className="mt-1 text-[11px] text-amber-400/90">
            Aucun poste vacant disponible. Créez une fiche dans Poste → Postes vacants.
          </p>
        )}
      </label>

      {selectedPosition ? (
        <PayrollSummaryCard
          title={`Paie du poste — ${selectedPosition.title}`}
          positionPayroll={mergePayrollWithEmployeeDependents(selectedPosition.payroll, emp)}
          extraCosts={draftCosts}
          currency={selectedPosition.payroll.currency}
          editableExtras
          extrasDisabled={saving}
          onExtraCostsChange={(costs) =>
            setDraftCosts((prev) => ({
              ...costs,
              currency: prev.currency ?? selectedPosition.payroll.currency,
            }))
          }
        />
      ) : (
        <div className="flex min-h-[10rem] flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center text-sm text-slate-500">
          Sélectionnez un poste pour afficher la paie du poste (bulletin + coûts extra).
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        <SaveButton
          type="button"
          disabled={!canSave}
          saving={saving}
          onClick={() =>
            void onSave(emp.id, {
              positionId: draftPositionId,
              extraCosts: draftCosts,
            })
          }
          className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Enregistrer
        </SaveButton>
        {!draftPositionId && dirty && (
          <p className="text-xs text-amber-400/90">Choisissez un poste avant d&apos;enregistrer.</p>
        )}
        <Link
          href={employeeDossierHref(emp.id)}
          className="ml-auto text-xs text-sky-400 hover:underline"
        >
          Ouvrir le dossier complet →
        </Link>
      </div>
    </div>
  );
}

export function AffectationPanel({
  employees: initialEmployees,
  positions,
}: {
  employees: Employee[];
  positions: JobPosition[];
}) {
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refreshEmployees = useCallback(async (): Promise<Employee[]> => {
    const res = await fetch("/api/employees");
    if (!res.ok) return [];
    const list = (await res.json()) as Employee[];
    const active = list.filter((e) =>
      (ACTIVE_STATUSES as readonly string[]).includes(e.status)
    );
    setEmployees(active);
    return active;
  }, []);

  const unassigned = employees.filter((e) => !e.positionId);

  const filteredUnassigned = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return unassigned;
    return unassigned.filter((e) => {
      const name = employeeDisplayName(e).toLowerCase();
      return (
        name.includes(q) ||
        e.matricule.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q)
      );
    });
  }, [unassigned, filter]);

  const selected =
    selectedId != null ? employees.find((e) => e.id === selectedId) ?? null : null;

  async function saveAffectation(
    id: string,
    payload: { positionId: string; extraCosts: EmployeeExtraCosts }
  ): Promise<boolean> {
    if (!id) {
      await showErrorAlert("Enregistrement impossible", "Identifiant employé manquant.");
      return false;
    }

    setSavingId(id);
    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionId: payload.positionId,
          extraCosts: payload.extraCosts,
        }),
      });

      if (res.status === 404) {
        const active = await refreshEmployees();
        const stillThere = active.some((e) => e.id === id);
        setSelectedId(null);
        router.refresh();
        await showErrorAlert(
          "Employé introuvable",
          stillThere
            ? "Réessayez après avoir resélectionné l'employé dans la liste."
            : "La liste a été actualisée : cet agent n'est plus disponible ou les données ont été régénérées. Sélectionnez-le à nouveau."
        );
        return false;
      }

      if (!res.ok) {
        await showErrorAlert("Enregistrement impossible", await readApiError(res));
        return false;
      }

      const updated = (await res.json()) as Employee;
      setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)));
      const pos = positions.find((p) => p.id === payload.positionId);
      await showSuccessAlert(
        "Affectation enregistrée",
        pos
          ? `${employeeDisplayName(updated)} est affecté(e) au poste ${pos.title}.`
          : "Le poste et les coûts extra ont été enregistrés."
      );
      return true;
    } catch (err) {
      await showErrorAlert(
        "Erreur réseau",
        err instanceof Error ? err.message : "Impossible de contacter le serveur."
      );
      return false;
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="grid h-[min(calc(100vh-11rem),40rem)] min-h-[24rem] gap-4 lg:grid-cols-[minmax(16rem,22rem)_1fr] lg:items-stretch">
      <Card className="flex min-h-0 flex-col overflow-hidden border-white/10">
        <CardContent className="flex min-h-0 flex-1 flex-col pt-4">
          <div className="shrink-0 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Users className="h-4 w-4 text-sky-400" />
              Sans poste lié
              <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-normal text-slate-400">
                {unassigned.length}
              </span>
            </div>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Rechercher…"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </div>
          <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
            {filteredUnassigned.map((emp) => {
              const active = selectedId === emp.id;
              return (
                <li key={emp.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(emp.id)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2.5 text-left text-sm transition",
                      active
                        ? "bg-sky-500/20 text-white ring-1 ring-sky-500/40"
                        : "text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <p className="font-medium">{employeeDisplayName(emp)}</p>
                    <p className="text-[10px] text-slate-500">
                      {emp.matricule} · {emp.department}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
          {filteredUnassigned.length === 0 && (
            <p className="shrink-0 py-4 text-center text-xs text-slate-500">
              {unassigned.length === 0
                ? "Tous les employés actifs ont un poste lié."
                : "Aucun résultat pour cette recherche."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-col overflow-hidden border-white/10">
        <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4">
          {selected ? (
            <AffectationForm
              key={selected.id}
              emp={selected}
              positions={positions}
              employees={employees}
              saving={savingId === selected.id}
              onSave={saveAffectation}
            />
          ) : (
            <div className="flex min-h-[18rem] flex-col items-center justify-center gap-2 text-center text-slate-500">
              <Users className="h-10 w-10 text-slate-600" />
              <p className="text-sm">Sélectionnez un employé dans la liste</p>
              <p className="text-xs max-w-xs">
                Affectez-le à un poste vacant et renseignez ses coûts extra.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
