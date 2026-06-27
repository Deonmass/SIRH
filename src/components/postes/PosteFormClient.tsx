"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { SaveButton } from "@/components/ui/SaveButton";
import { SalarySimulator } from "@/components/payroll/SalarySimulator";
import { PosteSuperiorField } from "@/components/postes/PosteSuperiorField";
import { GRADE_OPTIONS, applyOrganizationGradeToPayroll, statusLabel } from "@/lib/postes";
import {
  closeLoadingAlert,
  readApiError,
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts";
import { EMPLOYEE_KIND_LABELS } from "@/lib/employee-kind";
import { centreDesCoutsLabel } from "@/lib/centre-des-couts-utils";
import { DEFAULT_SMIG_BAREME } from "@/lib/smig-bareme";
import type { AppSettings, EmployeeKind, JobPosition, JobPositionPayroll } from "@/lib/types";
import { useAppSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

type TabId = "fiche" | "paie";

export function PosteFormClient({
  settings,
  positions,
  initial,
  mode,
}: {
  settings: AppSettings;
  positions: JobPosition[];
  initial: Omit<JobPosition, "id" | "code" | "createdAt" | "updatedAt"> & Partial<Pick<JobPosition, "id" | "code">>;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const { convertAmount, settings: liveSettings } = useAppSettings();
  const centresCouts = liveSettings.centresCouts ?? settings.centresCouts ?? [];
  const bareme = settings.smigBareme?.length ? settings.smigBareme : DEFAULT_SMIG_BAREME;
  const [tab, setTab] = useState<TabId>("fiche");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initial);

  useEffect(() => {
    closeLoadingAlert();
  }, []);

  const parentOptions = useMemo(
    () =>
      positions.filter(
        (p) => p.id !== initial.id && p.department === form.department
      ),
    [positions, initial.id, form.department]
  );
  const setPayroll = useCallback((payroll: JobPositionPayroll) => {
    setForm((f) => {
      if (JSON.stringify(f.payroll) === JSON.stringify(payroll)) return f;
      return { ...f, payroll };
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setTab("fiche");
      await showErrorAlert(
        "Champs obligatoires",
        "Renseignez l'intitulé du poste dans l'onglet « Fiche de poste »."
      );
      return;
    }
    setSaving(true);
    const payload = { ...form, title: form.title.trim() };
    const url = mode === "edit" && initial.id ? `/api/postes/${initial.id}` : "/api/postes";
    const method = mode === "edit" && initial.id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const saved = await res.json();
      router.refresh();
      await showSuccessAlert(
        mode === "create" ? "Fiche créée" : "Fiche mise à jour",
        `Le poste « ${saved.title} » (${saved.code}) a été enregistré avec succès.`
      );
      router.push("/postes");
    } else {
      await showErrorAlert("Enregistrement impossible", await readApiError(res));
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-2 border-b border-[var(--shell-border)]">
        {(
          [
            { id: "fiche" as const, label: "Fiche de poste" },
            { id: "paie" as const, label: "Simulateur de paie" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 px-4 py-3 text-sm font-medium transition",
              tab === t.id
                ? "border-sky-500 text-sky-600 dark:text-sky-400"
                : "border-transparent text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "fiche" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="font-semibold text-[var(--shell-text)]">Identification</h2>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Intitulé du poste *">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input w-full"
                />
              </Field>
              <Field label="Département *">
                <select
                  value={form.department}
                  onChange={(e) => {
                    const department = e.target.value;
                    setForm((f) => {
                      const superiorStillValid =
                        !f.reportsToId ||
                        positions.some(
                          (p) =>
                            p.id === f.reportsToId && p.department === department
                        );
                      return {
                        ...f,
                        department,
                        reportsToId: superiorStillValid ? f.reportsToId : null,
                      };
                    });
                  }}
                  className="input w-full"
                >
                  {settings.departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Grade *">
                <select
                  value={form.grade}
                  onChange={(e) => {
                    const grade = e.target.value as JobPosition["grade"];
                    setForm((f) => ({
                      ...f,
                      grade,
                      payroll: applyOrganizationGradeToPayroll(
                        grade,
                        f.payroll,
                        bareme,
                        convertAmount
                      ),
                    }));
                  }}
                  className="input w-full"
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Supérieur hiérarchique">
                <PosteSuperiorField
                  options={parentOptions}
                  value={form.reportsToId}
                  onChange={(reportsToId) => setForm({ ...form, reportsToId })}
                  emptyHint={
                    parentOptions.length === 0
                      ? "Aucun autre poste dans ce département."
                      : undefined
                  }
                />
              </Field>
              <Field label="Type de contrat">
                <select
                  value={form.contractType}
                  onChange={(e) =>
                    setForm({ ...form, contractType: e.target.value as JobPosition["contractType"] })
                  }
                  className="input w-full"
                >
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="apprentissage">Apprentissage</option>
                </select>
              </Field>
              <Field label="Type d'employé">
                <select
                  value={form.typeEmp ?? "interne"}
                  onChange={(e) =>
                    setForm({ ...form, typeEmp: e.target.value as EmployeeKind })
                  }
                  className="input w-full"
                >
                  {(Object.keys(EMPLOYEE_KIND_LABELS) as EmployeeKind[]).map((kind) => (
                    <option key={kind} value={kind}>
                      {EMPLOYEE_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Centre de coûts">
                <select
                  value={form.centreDesCoutsId ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      centreDesCoutsId: e.target.value ? e.target.value : null,
                    })
                  }
                  className="input w-full"
                >
                  <option value="">— Aucun —</option>
                  {centresCouts.map((centre) => (
                    <option key={centre.id} value={centre.id}>
                      {centreDesCoutsLabel(centre)}
                      {centre.autreInfo ? ` · ${centre.autreInfo}` : ""}
                    </option>
                  ))}
                </select>
                {form.centreDesCoutsId && (
                  <p className="mt-1 text-[10px] text-[var(--shell-text-muted)]">
                    {(() => {
                      const centre = centresCouts.find((c) => c.id === form.centreDesCoutsId);
                      if (!centre) return null;
                      return [centre.autreInfo, centre.text].filter(Boolean).join(" — ") || null;
                    })()}
                  </p>
                )}
              </Field>
              <Field label="Statut">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as JobPosition["status"] })
                  }
                  className="input w-full"
                >
                  <option value="draft">Brouillon</option>
                  <option value="vacant">Vacant</option>
                  <option value="active">Actif / occupé</option>
                  <option value="archived">Archivé</option>
                </select>
              </Field>
              <Field label="Site / lieu">
                <input
                  value={form.location ?? ""}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="input w-full"
                />
              </Field>
              <Field label="Effectif prévu">
                <input
                  type="number"
                  min={1}
                  value={form.headcount}
                  onChange={(e) => setForm({ ...form, headcount: Number(e.target.value) })}
                  className="input w-full"
                />
              </Field>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="font-semibold text-[var(--shell-text)]">Description du poste</h2>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field label="Résumé / périmètre">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input w-full"
                  placeholder="Rôle, contexte, place dans l'organisation…"
                />
              </Field>
              <Field label="Missions principales">
                <textarea
                  rows={4}
                  value={form.missions}
                  onChange={(e) => setForm({ ...form, missions: e.target.value })}
                  className="input w-full"
                  placeholder="Une mission par ligne"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Exigences / formation">
                  <textarea
                    rows={4}
                    value={form.requirements}
                    onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                    className="input w-full"
                  />
                </Field>
                <Field label="Compétences clés">
                  <textarea
                    rows={4}
                    value={form.competencies}
                    onChange={(e) => setForm({ ...form, competencies: e.target.value })}
                    className="input w-full"
                  />
                </Field>
              </div>
              <Field label="Indicateurs de performance (KPI)">
                <textarea
                  rows={2}
                  value={form.kpi ?? ""}
                  onChange={(e) => setForm({ ...form, kpi: e.target.value })}
                  className="input w-full"
                />
              </Field>
            </CardContent>
          </Card>
        </div>
      )}

      <div className={tab === "paie" ? undefined : "hidden"} aria-hidden={tab !== "paie"}>
        <SalarySimulator
          embedded
          settings={settings}
          params={settings}
          payrollConfig={form.payroll}
          onPayrollChange={setPayroll}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton
          type="submit"
          saving={saving}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          {mode === "edit" ? "Mettre à jour" : "Créer la fiche"}
        </SaveButton>
        {initial.code && (
          <span className="text-sm text-[var(--shell-text-muted)]">
            Code {initial.code} · {statusLabel(form.status)}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[var(--shell-text-muted)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
