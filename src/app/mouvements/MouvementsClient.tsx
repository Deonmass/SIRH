"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2, Pencil, Search, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MovementAttachmentsField } from "@/components/mouvements/MovementAttachmentsField";
import { MouvementPayrollPreview } from "@/components/mouvements/MouvementPayrollPreview";
import { PosteSuggestField } from "@/components/postes/PosteSuggestField";
import { Card, CardContent } from "@/components/ui/Card";
import { readApiError, showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import { movementTypeLabel } from "@/lib/employee-kind";
import { defaultExtraCosts, employeeDisplayName } from "@/lib/extra-costs";
import { resolveEmployeeExtraCosts } from "@/lib/extra-costs-resolve";
import { parseMovementAttachments } from "@/lib/movement-attachments";
import { assignablePositionsForEmployee } from "@/lib/postes";
import type {
  DbTypeMouvement,
} from "../../../database/migrations/004_mouvements.types";
import {
  TYPE_MOUVEMENT_LABELS,
  typeMouvementDesaffecte,
  typeMouvementRequiertPoste,
} from "../../../database/migrations/004_mouvements.types";
import type {
  Employee,
  EmployeeExtraCosts,
  JobPosition,
  Movement,
  MovementType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const MOVEMENT_TYPE_OPTIONS = Object.keys(TYPE_MOUVEMENT_LABELS) as DbTypeMouvement[];

function positionIdFromCode(positions: JobPosition[], code?: string | null): string {
  if (!code) return "";
  return positions.find((p) => p.code === code)?.id ?? "";
}

/** Employés éligibles aux mouvements (y compris sans poste affecté). */
const IN_SCOPE_STATUSES = [
  "candidat",
  "pre_embauche",
  "essai",
  "actif",
  "conge",
  "preavis",
  "suspendu",
] as const;

export function MouvementsClient({
  employees: allEmployees,
  positions,
}: {
  employees: Employee[];
  positions: JobPosition[];
}) {
  const router = useRouter();
  const employees = useMemo(
    () =>
      allEmployees.filter((e) =>
        (IN_SCOPE_STATUSES as readonly string[]).includes(e.status)
      ),
    [allEmployees]
  );

  const positionById = useMemo(
    () => new Map(positions.map((p) => [p.id, p])),
    [positions]
  );

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id ?? "");
  const [movementType, setMovementType] = useState<MovementType>("affectation");
  const [movementDate, setMovementDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [targetPositionId, setTargetPositionId] = useState("");
  const [previewPosition, setPreviewPosition] = useState<JobPosition | null>(null);
  const [reason, setReason] = useState("");
  const [documentAnnexes, setDocumentAnnexes] = useState<string[]>([]);
  const [draftCosts, setDraftCosts] = useState<EmployeeExtraCosts>(() =>
    defaultExtraCosts("USD")
  );
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const currentPosition = selectedEmployee?.positionId
    ? positionById.get(selectedEmployee.positionId)
    : undefined;
  const targetPosition = previewPosition;
  const requiresPoste = typeMouvementRequiertPoste(movementType);
  const isDesaffectation = typeMouvementDesaffecte(movementType);

  const selectablePositions = useMemo(() => {
    const base = positions.filter((p) => p.status !== "archived");
    const list =
      requiresPoste && selectedEmployee
        ? assignablePositionsForEmployee(base, selectedEmployee, allEmployees)
        : base;
    return [...list].sort((a, b) => a.title.localeCompare(b.title, "fr"));
  }, [positions, requiresPoste, selectedEmployee, allEmployees]);

  const employeeMovements = useMemo(() => {
    if (!selectedEmployee) return [];
    return [...(selectedEmployee.movements ?? [])].sort((a, b) =>
      b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    );
  }, [selectedEmployee]);

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const pos = e.positionId ? positionById.get(e.positionId) : null;
      const haystack = `${employeeDisplayName(e)} ${e.matricule} ${e.department} ${e.position} ${pos?.title ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [employees, employeeSearch, positionById]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setMovementType("affectation");
    setMovementDate(new Date().toISOString().split("T")[0]);
    setTargetPositionId("");
    setPreviewPosition(null);
    setReason("");
    setDocumentAnnexes([]);
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (emp) {
      setDraftCosts({
        ...resolveEmployeeExtraCosts(emp),
      });
    }
  }, [employees, selectedEmployeeId]);

  const lastEmployeeIdRef = useRef(selectedEmployeeId);
  useEffect(() => {
    if (lastEmployeeIdRef.current === selectedEmployeeId) return;
    lastEmployeeIdRef.current = selectedEmployeeId;
    resetForm();
  }, [selectedEmployeeId, resetForm]);

  const handlePositionChange = useCallback(
    (id: string) => {
      if (isDesaffectation) return;
      setTargetPositionId(id);
      if (!id) {
        setPreviewPosition(null);
        return;
      }
      const position =
        positionById.get(id) ?? selectablePositions.find((p) => p.id === id) ?? null;
      if (!position) return;
      setPreviewPosition(position);
      const emp = employees.find((e) => e.id === selectedEmployeeId);
      setDraftCosts({
        ...(emp ? resolveEmployeeExtraCosts(emp) : defaultExtraCosts(position.payroll.currency)),
        currency: position.payroll.currency,
      });
    },
    [positionById, selectablePositions, employees, selectedEmployeeId, isDesaffectation]
  );

  useEffect(() => {
    if (!isDesaffectation) return;
    if (!selectedEmployee?.positionId) {
      setPreviewPosition(null);
      setTargetPositionId("");
      return;
    }
    const pos = positionById.get(selectedEmployee.positionId);
    setPreviewPosition(pos ?? null);
    setTargetPositionId("");
  }, [isDesaffectation, selectedEmployee, positionById]);

  const loadMovementForEdit = useCallback(
    (movement: Movement) => {
      setEditingId(movement.id);
      setMovementType(movement.type);
      setMovementDate(movement.date);
      setReason(movement.reason ?? "");
      setDocumentAnnexes(parseMovementAttachments(movement.documentAnnexe));
      if (movement.extraCosts) {
        setDraftCosts({ ...movement.extraCosts });
      }
      const posId =
        positionIdFromCode(positions, movement.positionCode) ||
        positions.find((p) => p.code === movement.positionCode)?.id ||
        "";
      handlePositionChange(posId);
    },
    [positions, handlePositionChange]
  );

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedEmployeeId) return;
      if (requiresPoste && !targetPositionId) return;

      setLoading(true);
      try {
        const payload = {
          employeeId: selectedEmployeeId,
          type: movementType,
          date: movementDate,
          positionId: isDesaffectation ? undefined : targetPositionId || undefined,
          reason: reason.trim() || undefined,
          documentAnnexes,
          extraCosts: !isDesaffectation && targetPositionId ? draftCosts : undefined,
          effectiveDate: movementDate,
          legalBasis: isDesaffectation
            ? "Désaffectation"
            : movementTypeLabel(movementType),
        };

        const res = await fetch(
          editingId ? `/api/movements/${editingId}` : "/api/movements",
          {
            method: editingId ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          await showErrorAlert(
            editingId ? "Modification impossible" : "Mouvement impossible",
            await readApiError(res)
          );
          return;
        }

        await showSuccessAlert(
          editingId ? "Mouvement modifié" : "Mouvement enregistré",
          editingId
            ? "Les informations du mouvement ont été mises à jour."
            : `${employeeDisplayName(selectedEmployee!)} — ${movementTypeLabel(movementType)} enregistré(e).`
        );
        resetForm();
        router.refresh();
      } catch (err) {
        await showErrorAlert(
          "Erreur réseau",
          err instanceof Error ? err.message : "Impossible de contacter le serveur."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      selectedEmployeeId,
      requiresPoste,
      targetPositionId,
      movementType,
      movementDate,
      reason,
      documentAnnexes,
      draftCosts,
      editingId,
      selectedEmployee,
      isDesaffectation,
      resetForm,
      router,
    ]
  );

  const handleDelete = useCallback(
    async (movement: Movement) => {
      if (!selectedEmployeeId) return;
      if (!window.confirm(`Supprimer le mouvement ${movement.code ?? movement.id} ?`)) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/movements/${movement.id}?employeeId=${encodeURIComponent(selectedEmployeeId)}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          await showErrorAlert("Suppression impossible", await readApiError(res));
          return;
        }
        if (editingId === movement.id) resetForm();
        await showSuccessAlert("Mouvement supprimé", "Le mouvement a été retiré du journal.");
        router.refresh();
      } catch (err) {
        await showErrorAlert(
          "Erreur réseau",
          err instanceof Error ? err.message : "Impossible de contacter le serveur."
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedEmployeeId, editingId, resetForm, router]
  );

  const isSamePost =
    Boolean(selectedEmployee?.positionId && targetPositionId === selectedEmployee.positionId);
  const canSubmit = Boolean(
    selectedEmployeeId &&
      !loading &&
      (isDesaffectation
        ? Boolean(selectedEmployee?.positionId)
        : !requiresPoste || (targetPositionId && !isSamePost))
  );

  return (
    <>
      <PageHeader
        title="Mouvements du personnel"
        description="Enregistrement, modification et suivi des mouvements RH"
      >
        {selectedEmployee && (
          <>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm font-medium text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] disabled:opacity-50"
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              form="movement-form"
              disabled={!canSubmit}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </span>
              ) : editingId ? (
                "Mettre à jour"
              ) : (
                "Enregistrer le mouvement"
              )}
            </button>
          </>
        )}
      </PageHeader>

      <div className="grid h-[min(calc(100vh-11rem),52rem)] min-h-[28rem] gap-4 lg:grid-cols-[minmax(15rem,18rem)_minmax(16rem,1fr)_minmax(22rem,1.4fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden border-[var(--shell-border)]">
          <CardContent className="flex min-h-0 flex-1 flex-col pt-4">
            <div className="shrink-0 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--shell-text)]">
                <Users className="h-4 w-4 text-sky-500" />
                Employés
                <span className="ml-auto rounded-full bg-[var(--shell-surface)] px-2 py-0.5 text-[10px] font-normal text-[var(--shell-text-muted)]">
                  {employees.length}
                </span>
              </div>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-text-muted)]" />
                <input
                  type="search"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="input w-full py-1.5 pl-8 text-xs"
                />
              </label>
            </div>
            <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
              {filteredEmployees.map((emp) => {
                const linked = emp.positionId ? positionById.get(emp.positionId) : undefined;
                const active = selectedEmployeeId === emp.id;
                return (
                  <li key={emp.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2.5 text-left text-sm transition",
                        active
                          ? "bg-sky-500/15 text-[var(--shell-text)] ring-1 ring-sky-500/40"
                          : "text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
                      )}
                    >
                      <p className="font-medium text-[var(--shell-text)]">
                        {employeeDisplayName(emp)}
                      </p>
                      <p className="text-[10px] text-[var(--shell-text-muted)]">{emp.matricule}</p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400">
                        <Briefcase className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {linked ? `${linked.code} — ${linked.title}` : "Aucun poste lié"}
                        </span>
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden border-[var(--shell-border)]">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            {selectedEmployee ? (
              <form
                id="movement-form"
                onSubmit={submit}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="shrink-0 border-b border-[var(--shell-border)] px-4 py-3">
                  <p className="text-xs text-[var(--shell-text-muted)]">Employé sélectionné</p>
                  <p className="text-base font-semibold text-[var(--shell-text)]">
                    {employeeDisplayName(selectedEmployee)}
                  </p>
                  <p className="text-[11px] text-[var(--shell-text-muted)]">
                    {selectedEmployee.matricule} · {selectedEmployee.department}
                  </p>
                  {currentPosition && (
                    <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
                      Poste actuel :{" "}
                      <span className="font-medium text-[var(--shell-text)]">
                        {currentPosition.title}
                      </span>
                    </p>
                  )}
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
                  {isDesaffectation ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm">
                      <p className="font-medium text-[var(--shell-text)]">Désaffectation</p>
                      <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
                        {currentPosition
                          ? `Retrait du poste actuel : ${currentPosition.title} (${currentPosition.department})`
                          : "Cet employé n'est affecté à aucun poste."}
                      </p>
                    </div>
                  ) : (
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--shell-text-muted)]">
                      Poste
                    </span>
                    <div className="mt-1">
                      <PosteSuggestField
                        options={selectablePositions}
                        value={targetPositionId}
                        onChange={handlePositionChange}
                        employees={employees}
                        disabled={loading}
                        placeholder="Intitulé ou direction…"
                      />
                    </div>
                  </label>
                  )}

                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--shell-text-muted)]">
                      Type de mouvement
                    </span>
                    <select
                      value={movementType}
                      onChange={(e) => setMovementType(e.target.value as MovementType)}
                      className="input mt-1 w-full"
                      disabled={loading}
                    >
                      {MOVEMENT_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {TYPE_MOUVEMENT_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm">
                    <span className="text-xs text-[var(--shell-text-muted)]">Date du mouvement</span>
                    <input
                      type="date"
                      value={movementDate}
                      onChange={(e) => setMovementDate(e.target.value)}
                      className="input mt-1 w-full"
                      disabled={loading}
                      required
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="text-xs text-[var(--shell-text-muted)]">
                      Motif / justification
                    </span>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      placeholder="Motif du mouvement (optionnel)…"
                      className="input mt-1 w-full resize-none"
                      disabled={loading}
                    />
                  </label>

                  <div className="block text-sm">
                    <span className="text-xs text-[var(--shell-text-muted)]">
                      Documents annexes
                    </span>
                    <div className="mt-1">
                      <MovementAttachmentsField
                        key={`${selectedEmployeeId}-${editingId ?? "new"}`}
                        value={documentAnnexes}
                        onChange={setDocumentAnnexes}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {requiresPoste && isSamePost && !isDesaffectation && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Choisissez un poste différent du poste actuel.
                    </p>
                  )}

                  {employeeMovements.length > 0 && (
                    <div className="border-t border-[var(--shell-border)] pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--shell-text-muted)]">
                        Historique ({employeeMovements.length})
                      </p>
                      <ul className="space-y-1">
                        {employeeMovements.map((movement) => (
                          <li
                            key={movement.id}
                            className={cn(
                              "flex items-start gap-2 rounded-lg border px-2 py-2 text-xs",
                              editingId === movement.id
                                ? "border-violet-500/40 bg-violet-500/10"
                                : "border-[var(--shell-border)]"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-[var(--shell-text)]">
                                {movementTypeLabel(movement.type)}
                              </p>
                              <p className="text-[10px] text-[var(--shell-text-muted)]">
                                {movement.date}
                                {movement.code ? ` · ${movement.code}` : ""}
                              </p>
                              {movement.reason && (
                                <p className="mt-0.5 truncate text-[10px] text-[var(--shell-text-muted)]">
                                  {movement.reason}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                title="Modifier"
                                onClick={() => loadMovementForEdit(movement)}
                                className="rounded p-1 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-sky-500"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Supprimer"
                                onClick={() => handleDelete(movement)}
                                className="rounded p-1 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-rose-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </form>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-[var(--shell-text-muted)]">
                Sélectionnez un employé dans la première colonne.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden border-[var(--shell-border)]">
          <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4">
            {previewPosition ? (
              <MouvementPayrollPreview
                key={`${previewPosition.id}-${isDesaffectation ? "unassign" : "assign"}`}
                payrollConfig={previewPosition.payroll}
                employee={selectedEmployee}
                extraCosts={draftCosts}
                onExtraCostsChange={(costs) =>
                  setDraftCosts((prev) => ({
                    ...costs,
                    currency: prev.currency ?? previewPosition.payroll.currency,
                  }))
                }
                disabled={loading || isDesaffectation}
              />
            ) : isDesaffectation ? (
              <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--shell-border)] px-4 py-8 text-center text-sm text-[var(--shell-text-muted)]">
                <Briefcase className="h-8 w-8 opacity-40" />
                <p>Cet employé n&apos;a pas de poste à désaffecter.</p>
              </div>
            ) : (
              <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--shell-border)] px-4 py-8 text-center text-sm text-[var(--shell-text-muted)]">
                <Briefcase className="h-8 w-8 opacity-40" />
                <p>Sélectionnez un poste pour afficher le bulletin de paie.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
