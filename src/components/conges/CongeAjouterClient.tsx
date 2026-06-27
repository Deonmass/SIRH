"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { CongeFormFields, type CongeFormValues } from "./CongeFormFields";
import { readApiError, showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import type { Employee } from "@/lib/types";
import type { RhUser } from "@/lib/rh-users";
import { countWorkingDays } from "@/lib/conges-working-days";
import { cn } from "@/lib/utils";

export function CongeAjouterClient({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [rhUsers, setRhUsers] = useState<RhUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<CongeFormValues>({
    type: "annuel",
    startDate: today,
    endDate: today,
    days: 1,
    notes: "",
    validateur1: "",
    validateur2: "",
  });

  useEffect(() => {
    fetch("/api/utilisateurs/rh")
      .then((r) => r.json())
      .then(setRhUsers)
      .catch(() => setRhUsers([]));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = employees.filter((e) => !["sorti", "licencie"].includes(e.status));
    if (!q) return list.slice(0, 30);
    return list
      .filter(
        (e) =>
          `${e.prenom} ${e.nom}`.toLowerCase().includes(q) ||
          e.matricule.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [employees, search]);

  const selected = employees.find((e) => e.id === employeeId);

  async function submit() {
    if (!employeeId) {
      showErrorAlert("Sélectionnez un employé");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/conges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          type: values.type,
          startDate: values.startDate,
          endDate: values.endDate,
          notes: values.notes || undefined,
          validateur1: values.validateur1 || null,
          validateur2: values.validateur2 || null,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      showSuccessAlert("Demande de congé enregistrée");
      router.push("/conges/gestion");
    } catch (e) {
      showErrorAlert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-[var(--shell-text)]">Employé</h2>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-muted)]" />
            <input
              className="input w-full pl-9"
              placeholder="Rechercher nom, matricule…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setEmployeeId(e.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left text-sm transition",
                    employeeId === e.id
                      ? "border-sky-500/50 bg-sky-500/10"
                      : "border-[var(--shell-border)] hover:bg-[var(--shell-hover)]"
                  )}
                >
                  <span className="font-medium">
                    {e.prenom} {e.nom}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--shell-text-muted)]">
                    {e.matricule} · {e.department}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-[var(--shell-text)]">Nouvelle demande</h2>
          {selected && (
            <p className="text-sm text-[var(--shell-text-muted)]">
              {selected.prenom} {selected.nom} ({selected.matricule})
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <CongeFormFields
            rhUsers={rhUsers}
            values={values}
            onChange={(patch) =>
              setValues((v) => ({
                ...v,
                ...patch,
                days:
                  patch.days ??
                  (patch.startDate || patch.endDate
                    ? countWorkingDays(
                        patch.startDate ?? v.startDate,
                        patch.endDate ?? v.endDate
                      )
                    : v.days),
              }))
            }
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={saving || !employeeId}
              onClick={() => void submit()}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer la demande
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
