"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  calculateOvertimePay,
  hourlyRateFromMonthlyBase,
  monthlyLegalHours,
} from "@/lib/payroll-rdc";
import type { Employee, EmployeeOvertime, WorkMonthMode } from "@/lib/types";
import { useAppSettings } from "@/contexts/SettingsContext";
import { resolveWorkMonthMode } from "@/lib/work-month-mode";

export function OvertimeEditor({
  employee,
  onSave,
}: {
  employee: Employee;
  onSave: (data: Pick<Employee, "overtime" | "workMonthMode">) => void;
}) {
  const { formatSalary, settings } = useAppSettings();
  const defaultMode = resolveWorkMonthMode(employee, settings);
  const [overtime, setOvertime] = useState(employee.overtime ?? { hours130: 0, hours160: 0, hours200: 0 });
  const [mode, setMode] = useState<WorkMonthMode>(defaultMode);

  useEffect(() => {
    setOvertime(employee.overtime ?? { hours130: 0, hours160: 0, hours200: 0 });
    setMode(resolveWorkMonthMode(employee, settings));
  }, [employee.id, employee.overtime, employee.workMonthMode, settings.workMonthMode]);
  const currency = employee.salary.currency;
  const monthlyBase = employee.salary.baseSalary;
  const legalHours = monthlyLegalHours(mode);
  const hourly = hourlyRateFromMonthlyBase(monthlyBase, mode);

  const breakdown = useMemo(() => {
    const h130 = overtime.hours130 ?? 0;
    const h160 = overtime.hours160 ?? 0;
    const h200 = overtime.hours200 ?? 0;
    const pay130 = hourly * h130 * 1.3;
    const pay160 = hourly * h160 * 1.6;
    const pay200 = hourly * h200 * 2;
    const total = calculateOvertimePay(monthlyBase, overtime, mode);
    return { h130, h160, h200, pay130, pay160, pay200, total };
  }, [overtime, hourly, monthlyBase, mode]);

  function update(patch: Partial<EmployeeOvertime>) {
    setOvertime((o) => ({ ...o, ...patch }));
  }

  function handleSave() {
    onSave({ overtime, workMonthMode: mode });
  }

  const fmt = (n: number) => formatSalary(n, currency);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Heures supplémentaires</h2>
          <p className="text-sm text-slate-400">
            Régime {mode} j — {legalHours} h légales/mois · taux horaire = base ÷ {legalHours}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-xs text-slate-400">
            Régime de travail
            <select
              value={mode}
              onChange={(e) => setMode(Number(e.target.value) as WorkMonthMode)}
              className="input mt-1 w-full"
            >
              <option value={26}>26 jours / mois (8 h × 26)</option>
              <option value={22}>22 jours / mois (8,8 h × 22)</option>
            </select>
            <span className="mt-1 block text-[10px] text-slate-500">
              Défaut entreprise : {settings.workMonthMode ?? 26} j. / mois (Paramètres → Congés & préavis)
            </span>
          </label>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
            <p className="text-slate-400">Taux horaire (base mensuelle)</p>
            <p className="mt-1 font-mono text-white">
              {fmt(monthlyBase)} ÷ {legalHours} h = <strong>{fmt(hourly)}/h</strong>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <HourField
              label="HS 130 %"
              sub="2 premières h / jour ouvrable"
              value={overtime.hours130 ?? 0}
              onChange={(v) => update({ hours130: v })}
            />
            <HourField
              label="HS 160 %"
              sub="Au-delà de 2 h / jour"
              value={overtime.hours160 ?? 0}
              onChange={(v) => update({ hours160: v })}
            />
            <HourField
              label="HS 200 %"
              sub="Dimanche, férié, samedi"
              value={overtime.hours200 ?? 0}
              onChange={(v) => update({ hours200: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Calcul & formules</h2>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <FormulaRow
            label="130 %"
            formula={`${fmt(hourly)}/h × ${breakdown.h130} h × 1,3`}
            value={breakdown.pay130}
            format={fmt}
          />
          <FormulaRow
            label="160 %"
            formula={`${fmt(hourly)}/h × ${breakdown.h160} h × 1,6`}
            value={breakdown.pay160}
            format={fmt}
          />
          <FormulaRow
            label="200 %"
            formula={`${fmt(hourly)}/h × ${breakdown.h200} h × 2`}
            value={breakdown.pay200}
            format={fmt}
          />
          <div className="mt-3 flex justify-between border-t border-white/10 pt-3 font-semibold text-white">
            <div>
              <span>Total HS imposable</span>
              <p className="mt-0.5 text-[11px] font-normal text-slate-500">
                = {fmt(breakdown.pay130)} + {fmt(breakdown.pay160)} + {fmt(breakdown.pay200)}
              </p>
            </div>
            <span className="text-sky-400">{fmt(breakdown.total)}</span>
          </div>
          <p className="text-xs text-slate-500 pt-2">
            Intégré à la rémunération imposable (CNSS, IRPP). Plafond légal : 45 h/semaine — Art.
            Code du travail.
          </p>
          <button
            type="button"
            onClick={handleSave}
            className="mt-4 w-full rounded-xl bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Enregistrer les heures sup.
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function HourField({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <p className="text-[10px] text-slate-600 mb-1">{sub}</p>
      <input
        type="number"
        min={0}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input w-full"
      />
    </label>
  );
}

function FormulaRow({
  label,
  formula,
  value,
  format,
}: {
  label: string;
  formula: string;
  value: number;
  format: (n: number) => string;
}) {
  return (
    <div className="flex justify-between gap-4 rounded-lg px-2 py-1.5 text-slate-400">
      <div className="min-w-0">
        <span className="text-slate-300">{label}</span>
        <p className="text-[11px] text-slate-600">= {formula}</p>
      </div>
      <span className="shrink-0 tabular-nums text-slate-200">{format(value)}</span>
    </div>
  );
}
