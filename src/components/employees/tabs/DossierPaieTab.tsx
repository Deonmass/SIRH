"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, ChevronDown, ChevronRight, Coins, FileDown } from "lucide-react";
import { SalarySimulator } from "@/components/payroll/SalarySimulator";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAppSettings } from "@/contexts/SettingsContext";
import { showErrorAlert } from "@/lib/alerts";
import { EXTRA_COST_RECAP_LABELS, EXTRA_COST_FIELDS } from "@/lib/extra-costs";
import {
  moisAnneeLabelFr,
  resolvePaieRecordExtraCosts,
} from "@/lib/paie-utils";
import { exportPaieRecordPdf } from "@/lib/payslip-export";
import { renderPayslipHtml } from "@/lib/payslip-html";
import { normalizePayslipTemplate } from "@/lib/payslip-template-default";
import {
  mergePayrollWithEmployeeDependents,
  rebuildPayrollConfigFromPositionDaily,
  resolveDailyBaseFromPositionPayroll,
} from "@/lib/payroll-simulator-config";
import { DEFAULT_SMIG_BAREME } from "@/lib/smig-bareme";
import type { AppSettings, Currency, Employee, JobPosition, PaieListRow, PayslipTemplateConfig } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function BulletinExtraCostsPanel({
  rec,
  employee,
  settings,
}: {
  rec: PaieListRow;
  employee: Employee;
  settings: AppSettings;
}) {
  const { formatSalary } = useAppSettings();
  const { costs, total, fromSnapshot } = useMemo(
    () => resolvePaieRecordExtraCosts(rec, employee, settings),
    [rec, employee, settings]
  );
  const currency = rec.payrollResult.currency;
  const net = rec.payrollResult.netSalary;
  const grandTotal = net + total;

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80">
      <div className="border-b border-[var(--shell-border)] px-3 py-2">
        <h3 className="text-sm font-semibold text-[var(--shell-text)]">Coûts extra</h3>
        <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">
          Indemnités hors bulletin
          {!fromSnapshot && (
            <span className="ml-1 text-amber-500/90">· dossier actuel (re-clôturez pour figer)</span>
          )}
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {total === 0 ? (
          <p className="text-sm text-[var(--shell-text-muted)]">
            Aucun coût extra renseigné. Définissez-les dans Rémunération → Coûts extra.
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {EXTRA_COST_FIELDS.map(({ field, label }) => {
              const value = costs[field] ?? 0;
              if (value <= 0) return null;
              return (
                <li
                  key={field}
                  className="flex items-center justify-between gap-2 text-[var(--shell-text-muted)]"
                >
                  <span>{EXTRA_COST_RECAP_LABELS[field] ?? label}</span>
                  <span className="shrink-0 tabular-nums text-[var(--shell-text)]">
                    {formatSalary(value, currency)}
                  </span>
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-2 border-t border-[var(--shell-border)] pt-2 font-semibold text-amber-500">
              <span>Total coûts extra</span>
              <span className="tabular-nums">{formatSalary(total, currency)}</span>
            </li>
          </ul>
        )}
        <div className="space-y-2 border-t border-[var(--shell-border)] pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--shell-text-muted)]">Net à payer (bulletin)</span>
            <span className="font-medium tabular-nums text-emerald-500">
              {formatSalary(net, currency)}
            </span>
          </div>
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2">
            <p className="text-[10px] uppercase text-[var(--shell-text-muted)]">Total à payer</p>
            <p className="text-lg font-bold tabular-nums text-sky-400">
              {formatSalary(grandTotal, currency)}
            </p>
            {total > 0 && (
              <p className="text-[10px] text-[var(--shell-text-muted)]">Net bulletin + coûts extra</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DossierPaieTab({
  employee,
  settings: settingsProp,
}: {
  employee: Employee;
  settings?: AppSettings;
}) {
  const { settings: ctxSettings, convertAmount, formatSalary } = useAppSettings();
  const settings = settingsProp ?? ctxSettings;

  const [records, setRecords] = useState<PaieListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkedPosition, setLinkedPosition] = useState<JobPosition | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [bulletinCurrencies, setBulletinCurrencies] = useState<Record<string, Currency>>({});
  const [template, setTemplate] = useState<PayslipTemplateConfig>(() =>
    normalizePayslipTemplate(undefined)
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/paie/runs?matricule=${encodeURIComponent(employee.matricule)}`);
      if (res.ok) setRecords(await res.json());
    } finally {
      setLoading(false);
    }
  }, [employee.matricule]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!employee.positionId) {
      setLinkedPosition(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/postes/${encodeURIComponent(employee.positionId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: JobPosition | null) => {
        if (!cancelled) setLinkedPosition(data);
      })
      .catch(() => {
        if (!cancelled) setLinkedPosition(null);
      });
    return () => {
      cancelled = true;
    };
  }, [employee.positionId]);

  const positionPayroll = useMemo(() => {
    if (!linkedPosition) return null;
    return mergePayrollWithEmployeeDependents(linkedPosition.payroll, employee);
  }, [linkedPosition, employee]);

  const bareme = settings.smigBareme?.length ? settings.smigBareme : DEFAULT_SMIG_BAREME;

  function bulletinPayrollConfig(rec: PaieListRow) {
    if (!positionPayroll) return rec.payrollConfig;
    return rebuildPayrollConfigFromPositionDaily(
      positionPayroll,
      {
        daysPresent: rec.payrollConfig.daysPresent ?? 0,
        daysSick: rec.payrollConfig.daysSick,
        daysAnnualLeave: rec.payrollConfig.daysAnnualLeave,
        daysHoliday: rec.payrollConfig.daysHoliday,
      },
      bareme,
      convertAmount
    );
  }

  useEffect(() => {
    fetch("/api/paie/template")
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => {
        if (t) setTemplate(normalizePayslipTemplate(t));
      })
      .catch(() => {});
  }, []);

  async function exportPdf(rec: PaieListRow, e: React.MouseEvent) {
    e.stopPropagation();
    setExportingId(rec.id);
    try {
      await exportPaieRecordPdf(
        employee,
        { ...rec, payrollConfig: bulletinPayrollConfig(rec) },
        settings,
        (data, s) =>
          renderPayslipHtml(data, template, s, { assetBaseUrl: window.location.origin })
      );
    } catch (err) {
      showErrorAlert(err instanceof Error ? err.message : "Export PDF impossible");
    } finally {
      setExportingId(null);
    }
  }

  if (loading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  if (records.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--shell-border)] py-12 text-center text-sm text-[var(--shell-text-muted)]">
        Aucun bulletin de paie clôturé pour {employee.prenom} {employee.nom}.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((rec) => {
        const open = expandedId === rec.id;
        const r = rec.payrollResult;
        const extras = resolvePaieRecordExtraCosts(rec, employee, settings);
        const bulletinCurrency = bulletinCurrencies[rec.id] ?? r.currency;
        const payrollConfig = bulletinPayrollConfig(rec);
        const dailyFromPoste = positionPayroll
          ? resolveDailyBaseFromPositionPayroll(positionPayroll, settings, convertAmount)
          : payrollConfig.dailyBaseSalary;
        return (
          <div key={rec.id} className="overflow-hidden rounded-xl border border-[var(--shell-border)]">
            <div className="flex w-full items-stretch">
              <button
                type="button"
                onClick={() => setExpandedId(open ? null : rec.id)}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-[var(--shell-hover)]/30"
              >
                {open ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--shell-text-muted)]" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--shell-text-muted)]" />
                )}
                <Banknote className="h-4 w-4 shrink-0 text-sky-400" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium capitalize">{moisAnneeLabelFr(rec.moisAnnee)}</p>
                  <p className="text-xs text-[var(--shell-text-muted)]">
                    P:{rec.payrollConfig.daysPresent} · M:{rec.payrollConfig.daysSick} · C:
                    {rec.payrollConfig.daysAnnualLeave} · F:{rec.payrollConfig.daysHoliday}
                    {rec.clotureLe ? ` · ${formatDate(rec.clotureLe.slice(0, 10))}` : ""}
                    {dailyFromPoste != null && dailyFromPoste > 0 && (
                      <span className="text-sky-500/90">
                        {" "}
                        · Base j. {formatSalary(dailyFromPoste, r.currency)}
                      </span>
                    )}
                    {extras.total > 0 && (
                      <span className="text-amber-500/90">
                        {" "}
                        · Extra {Math.round(extras.total).toLocaleString("fr-FR")} {r.currency}
                      </span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 pr-2 text-right">
                  <p className="font-semibold tabular-nums text-emerald-500">
                    {Math.round(r.netSalary).toLocaleString("fr-FR")} {r.currency}
                  </p>
                  <p className="text-[10px] text-[var(--shell-text-muted)]">Net à payer</p>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => void exportPdf(rec, e)}
                disabled={exportingId === rec.id}
                title="Exporter le bulletin en PDF"
                aria-label="Exporter le bulletin en PDF"
                className="flex shrink-0 items-center justify-center self-stretch border-l border-[var(--shell-border)] px-3 text-sky-400 hover:bg-sky-500/10 disabled:opacity-50"
              >
                <FileDown className="h-5 w-5" />
              </button>
            </div>
            {open && (
              <div className="border-t border-[var(--shell-border)] bg-[var(--shell-surface)]/40 p-4">
                <div className="grid min-h-[24rem] gap-4 lg:grid-cols-2">
                  <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80">
                    <div className="flex min-h-[2.75rem] items-stretch border-b border-[var(--shell-border)]">
                      <h3 className="flex flex-1 items-center px-3 text-sm font-semibold text-[var(--shell-text)]">
                        Bulletin de paie
                      </h3>
                      <label className="flex shrink-0 items-stretch border-l border-[var(--shell-border)]">
                        <span className="sr-only">Devise du bulletin</span>
                        <span className="flex items-center px-2 text-[var(--shell-text-muted)]">
                          <Coins className="h-4 w-4" aria-hidden />
                        </span>
                        <select
                          value={bulletinCurrency}
                          onChange={(e) =>
                            setBulletinCurrencies((prev) => ({
                              ...prev,
                              [rec.id]: e.target.value as Currency,
                            }))
                          }
                          aria-label="Devise du bulletin"
                          className="h-full min-w-[4.5rem] border-0 bg-transparent py-0 pl-0 pr-3 text-sm text-[var(--shell-text)] focus:outline-none focus:ring-0"
                        >
                          <option value="CDF">CDF</option>
                          <option value="USD">USD</option>
                        </select>
                      </label>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                      <SalarySimulator
                        embedded
                        readOnly
                        stacked
                        bulletinOnly
                        compactTotals
                        hideCurrencySelector
                        displayCurrency={bulletinCurrency}
                        onDisplayCurrencyChange={(c) =>
                          setBulletinCurrencies((prev) => ({ ...prev, [rec.id]: c }))
                        }
                        payrollConfig={payrollConfig}
                      />
                    </div>
                  </div>
                  <BulletinExtraCostsPanel rec={rec} employee={employee} settings={settings} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
