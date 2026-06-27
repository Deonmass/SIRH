"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { Allowance, Employee, SalaryPackage } from "@/lib/types";
import { useAppSettings } from "@/contexts/SettingsContext";
import { calculatePayroll } from "@/lib/payroll";
import type { AppSettings } from "@/lib/types";

const ALLOWANCE_TYPES: Allowance["type"][] = [
  "transport",
  "logement",
  "panier",
  "fonction",
  "anciennete",
  "familiale",
  "autre",
];

export function AllowancesEditor({
  employee,
  settings,
  onSave,
}: {
  employee: Employee;
  settings: AppSettings;
  onSave: (salary: SalaryPackage) => void;
}) {
  const { formatSalary, formatEquivalent, convertAmount, hideSalaries, canEditSalaries } =
    useAppSettings();
  const readOnlySalary = hideSalaries || !canEditSalaries;
  const [salary, setSalary] = useState(employee.salary);

  function handleCurrencyChange(next: typeof salary.currency) {
    if (next === salary.currency) return;
    const from = salary.currency;
    setSalary({
      ...salary,
      currency: next,
      baseSalary: convertAmount(salary.baseSalary, from, next),
      allowances: salary.allowances.map((a) => ({
        ...a,
        currency: next,
        amount: convertAmount(a.amount, a.currency, next),
      })),
    });
  }

  const preview = calculatePayroll(salary, settings, 0, {
    dependents: employee.family.filter((m) => m.aCharge).length,
  });

  function addAllowance() {
    setSalary({
      ...salary,
      allowances: [
        ...salary.allowances,
        {
          id: uuidv4(),
          type: "autre",
          label: "Nouvelle prime",
          amount: 0,
          currency: salary.currency,
          taxable: true,
          cotisable: true,
        },
      ],
    });
  }

  function updateAllowance(id: string, patch: Partial<Allowance>) {
    setSalary({
      ...salary,
      allowances: salary.allowances.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      ),
    });
  }

  function removeAllowance(id: string) {
    setSalary({
      ...salary,
      allowances: salary.allowances.filter((a) => a.id !== id),
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-white">Avantages & primes</h2>
            <button
              type="button"
              onClick={addAllowance}
              disabled={readOnlySalary}
              className="inline-flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <label className="block text-sm">
            <span className="text-slate-400">Devise du package</span>
            <select
              value={salary.currency}
              onChange={(e) => handleCurrencyChange(e.target.value as typeof salary.currency)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white text-sm"
            >
              <option value="CDF">CDF</option>
              <option value="USD">USD</option>
            </select>
          </label>
          {readOnlySalary && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {hideSalaries
                ? "Montants masqués — permission « Voir les montants salariaux » requise."
                : "Lecture seule — permission « Saisir / modifier les rémunérations » requise."}
            </p>
          )}
          <label className="block text-sm">
            <span className="text-slate-400">Salaire de base ({salary.currency})</span>
            <input
              type={hideSalaries ? "text" : "number"}
              value={hideSalaries ? formatSalary(salary.baseSalary, salary.currency) : salary.baseSalary}
              readOnly={readOnlySalary}
              disabled={readOnlySalary}
              onChange={(e) =>
                setSalary({ ...salary, baseSalary: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white disabled:opacity-70"
            />
            {formatEquivalent(salary.baseSalary, salary.currency) && (
              <p className="text-xs text-slate-500 mt-1">{formatEquivalent(salary.baseSalary, salary.currency)}</p>
            )}
          </label>
          {salary.allowances.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-white/10 p-3 space-y-2"
            >
              <div className="flex justify-between">
                <select
                  value={a.type}
                  onChange={(e) =>
                    updateAllowance(a.id, { type: e.target.value as Allowance["type"] })
                  }
                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm text-white"
                >
                  {ALLOWANCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeAllowance(a.id)}
                  className="text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input
                placeholder="Libellé"
                value={a.label}
                onChange={(e) => updateAllowance(a.id, { label: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              />
              <input
                type={hideSalaries ? "text" : "number"}
                value={hideSalaries ? formatSalary(a.amount, salary.currency) : a.amount}
                readOnly={readOnlySalary}
                disabled={readOnlySalary}
                onChange={(e) =>
                  updateAllowance(a.id, { amount: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white disabled:opacity-70"
              />
              <div className="flex gap-4 text-xs text-slate-400">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={a.cotisable}
                    onChange={(e) =>
                      updateAllowance(a.id, { cotisable: e.target.checked })
                    }
                  />
                  Cotisable CNSS
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={a.taxable}
                    onChange={(e) =>
                      updateAllowance(a.id, { taxable: e.target.checked })
                    }
                  />
                  Imposable IPR
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onSave(salary)}
            disabled={readOnlySalary}
            className="w-full rounded-xl bg-emerald-600 py-2.5 font-semibold text-white disabled:opacity-40"
          >
            Mettre à jour les avantages
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Aperçu paie après modification</h2>
        </CardHeader>
        <CardContent className="space-y-2 text-sm pt-0">
          <Row label="Brut" value={formatSalary(preview.grossSalary)} />
          <Row label="CNSS 5%" value={`− ${formatSalary(preview.cnssEmployee)}`} />
          <Row label="IPR" value={`− ${formatSalary(preview.ipr)}`} />
          <Row label="NET" value={formatSalary(preview.netSalary)} accent />
          <Row label="Coût employeur" value={formatSalary(preview.totalEmployerCost)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={accent ? "text-emerald-400 font-bold" : "text-white"}>
        {value}
      </span>
    </div>
  );
}
