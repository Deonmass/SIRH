"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Info, RotateCcw } from "lucide-react";
import { SoldeToutCompteInfoModal } from "@/components/employees/SoldeToutCompteInfoModal";
import { useAppSettings } from "@/contexts/SettingsContext";
import { formatSeniorityLabel, resolveEmployeeHireDate } from "@/lib/employee-seniority";
import { mergePayrollWithEmployeeDependents } from "@/lib/payroll-simulator-config";
import {
  computeSoldeToutCompte,
  formatStcDays,
  parseStcDaysInput,
  RUPTURE_TYPE_LABELS,
  STC_RUPTURE_TYPES,
  type RuptureType,
} from "@/lib/solde-tout-compte";
import type { AppSettings, Employee, JobPosition } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

function ContextCard({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)]/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[var(--shell-text-muted)]">{label}</p>
      {children ?? (
        <p className="mt-0.5 text-sm font-medium text-[var(--shell-text)]">{value}</p>
      )}
    </div>
  );
}

function ScrollBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--shell-border)] bg-[var(--shell-bg)]/40">
      <h4 className="shrink-0 border-b border-[var(--shell-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--shell-text-muted)]">
        {title}
      </h4>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">{children}</div>
    </div>
  );
}

function AmountTable({
  lines,
  totalLabel,
  total,
  fmt,
  tone = "du",
}: {
  lines: { id: string; label: string; formula: string; amount: number }[];
  totalLabel: string;
  total: number;
  fmt: (n: number) => string;
  tone?: "du" | "retenus";
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--shell-border)]">
      <table className="w-full text-left text-sm">
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-t border-[var(--shell-border)]/60 first:border-t-0">
              <td className="px-3 py-2 align-top">
                <p className="font-medium text-[var(--shell-text)]">{line.label}</p>
                <p className="mt-0.5 font-mono text-[10px] leading-snug text-sky-300/80">
                  {line.formula}
                </p>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right align-top font-semibold tabular-nums text-[var(--shell-text)]">
                {fmt(line.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot
          className={cn(
            "border-t-2 border-[var(--shell-border)]",
            tone === "du" ? "bg-emerald-500/5" : "bg-red-500/5"
          )}
        >
          <tr>
            <td className="px-3 py-2.5 font-semibold text-[var(--shell-text)]">{totalLabel}</td>
            <td
              className={cn(
                "px-3 py-2.5 text-right text-base font-bold tabular-nums",
                tone === "du" ? "text-emerald-400" : "text-red-400"
              )}
            >
              {fmt(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function DossierSoldeToutComptePanel({
  employee,
}: {
  employee: Employee;
  /** @deprecated Les paramètres viennent du SettingsContext (toujours à jour). */
  settings?: AppSettings;
}) {
  const { settings, formatSalary, convertAmount } = useAppSettings();
  const [linkedPosition, setLinkedPosition] = useState<JobPosition | null>(null);
  const [loadingPosition, setLoadingPosition] = useState(false);
  const [terminationDate, setTerminationDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [ruptureType, setRuptureType] = useState<RuptureType>("demission");
  const [showInfo, setShowInfo] = useState(false);
  const [daysPresent, setDaysPresent] = useState<number | null>(null);
  const [noticeDaysText, setNoticeDaysText] = useState("");
  const [noticeDaysCustom, setNoticeDaysCustom] = useState(false);

  useEffect(() => {
    if (!employee.positionId) {
      setLinkedPosition(null);
      return;
    }
    let cancelled = false;
    setLoadingPosition(true);
    fetch(`/api/postes/${encodeURIComponent(employee.positionId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: JobPosition | null) => {
        if (!cancelled) setLinkedPosition(data);
      })
      .finally(() => {
        if (!cancelled) setLoadingPosition(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employee.positionId]);

  const positionPayroll = useMemo(() => {
    if (!linkedPosition) return null;
    return mergePayrollWithEmployeeDependents(linkedPosition.payroll, employee);
  }, [linkedPosition, employee]);

  useEffect(() => {
    setDaysPresent(null);
    setNoticeDaysCustom(false);
    setNoticeDaysText("");
  }, [terminationDate, ruptureType, employee.id, positionPayroll]);

  const noticeDaysForCalc = noticeDaysCustom
    ? (parseStcDaysInput(noticeDaysText) ?? 0)
    : undefined;

  const result = useMemo(
    () =>
      computeSoldeToutCompte({
        employee,
        settings,
        positionPayroll,
        terminationDate,
        ruptureType,
        convertAmount,
        daysPresent: daysPresent ?? undefined,
        noticeDays: noticeDaysForCalc,
      }),
    [
      employee,
      settings,
      positionPayroll,
      terminationDate,
      ruptureType,
      convertAmount,
      daysPresent,
      noticeDaysForCalc,
    ]
  );

  useEffect(() => {
    if (!noticeDaysCustom) {
      setNoticeDaysText(formatStcDays(result.noticeDaysCalculated));
    }
  }, [result.noticeDaysCalculated, noticeDaysCustom]);

  const hireDate = resolveEmployeeHireDate(employee);
  const seniority = hireDate ? formatSeniorityLabel(hireDate) : result.seniorityLabel;
  const fmt = (n: number) => formatSalary(n, result.currency);

  const daysPresentValue = daysPresent ?? result.daysPresent;
  const noticeParsed = parseStcDaysInput(noticeDaysText);
  const noticeIsManual =
    noticeDaysCustom &&
    (noticeParsed === null ||
      Math.abs(noticeParsed - result.noticeDaysCalculated) > 0.005);

  function restoreNoticeAutoCalc() {
    setNoticeDaysCustom(false);
    setNoticeDaysText(formatStcDays(result.noticeDaysCalculated));
  }

  return (
    <>
      <div className="flex h-[min(calc(100vh-14rem),44rem)] min-h-[24rem] flex-col overflow-hidden rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80">
        <div className="flex shrink-0 flex-wrap items-end gap-3 border-b border-[var(--shell-border)] px-3 py-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[var(--shell-text)]">
              Solde de tout compte
            </h3>
            <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">
              Décompte STC — DU, retenues et net à payer
            </p>
          </div>
          <label className="shrink-0 text-xs text-[var(--shell-text-muted)]">
            Date de rupture
            <input
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              className="mt-1 block rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-1.5 text-sm text-[var(--shell-text)]"
            />
          </label>
          <label className="min-w-[11rem] shrink-0 text-xs text-[var(--shell-text-muted)]">
            Type de rupture
            <select
              value={ruptureType}
              onChange={(e) => setRuptureType(e.target.value as RuptureType)}
              className="mt-1 block w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-1.5 text-sm text-[var(--shell-text)]"
            >
              {STC_RUPTURE_TYPES.map((key) => (
                <option key={key} value={key}>
                  {RUPTURE_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            title="Explications du calcul"
            aria-label="Explications du calcul"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,32%)_minmax(0,68%)] lg:items-stretch">
          <ScrollBlock title="Contexte">
            <div className="space-y-2">
              {loadingPosition ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))
              ) : (
                <>
                  <ContextCard
                    label="Salaire de base journalier"
                    value={`${fmt(result.dailyBase)} / j.`}
                  />
                  <ContextCard
                    label="Logement journalier"
                    value={`${fmt(result.dailyHousing)} / j.`}
                  />
                  <ContextCard
                    label="Transport journalier"
                    value={`${fmt(result.dailyTransport)} / j.`}
                  />
                  <ContextCard label="Taux journalier total (jours prestés)">
                    <p className="mt-0.5 text-sm font-medium text-[var(--shell-text)]">
                      {fmt(result.dailyTotal)} / j.
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--shell-text-muted)]">
                      {fmt(result.dailyBase)} + {fmt(result.dailyHousing)} +{" "}
                      {fmt(result.dailyTransport)}
                    </p>
                  </ContextCard>

                  <ContextCard label="Jours prestés (mois de sortie)">
                    <input
                      type="number"
                      min={0}
                      max={31}
                      step={1}
                      value={daysPresentValue}
                      onChange={(e) =>
                        setDaysPresent(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-2 py-1 text-sm text-[var(--shell-text)]"
                    />
                    <p className="mt-1 text-[10px] text-[var(--shell-text-muted)]">
                      Mode {result.workDaysPerMonth} j. / mois — défaut : jour de rupture
                    </p>
                  </ContextCard>

                  <ContextCard label="Jours de préavis">
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex min-w-0 flex-1 items-center rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)]">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={noticeDaysText}
                          onChange={(e) => {
                            setNoticeDaysCustom(true);
                            setNoticeDaysText(e.target.value);
                          }}
                          onBlur={() => {
                            const parsed = parseStcDaysInput(noticeDaysText);
                            if (parsed != null) {
                              setNoticeDaysText(formatStcDays(parsed));
                            }
                          }}
                          placeholder="0.00"
                          aria-label="Jours de préavis exécutés ou dus"
                          className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm tabular-nums text-[var(--shell-text)] outline-none"
                        />
                        <span className="shrink-0 pr-2 text-sm text-[var(--shell-text-muted)]">
                          j.
                        </span>
                      </div>
                      <button
                        type="button"
                        title="Réafficher le calcul automatique"
                        onClick={restoreNoticeAutoCalc}
                        disabled={!noticeIsManual}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors",
                          noticeIsManual
                            ? "border-sky-500/35 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
                            : "cursor-default border-[var(--shell-border)] text-[var(--shell-text-muted)] opacity-50"
                        )}
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden />
                        Calcul auto
                      </button>
                    </div>
                  </ContextCard>

                  <ContextCard
                    label="Solde congé"
                    value={`${result.leaveRemainingDays} jour${result.leaveRemainingDays !== 1 ? "s" : ""}`}
                  />

                  <div className="my-2 border-t border-[var(--shell-border)]/60" />

                  <ContextCard
                    label="Date d'embauche"
                    value={hireDate ? formatDate(hireDate) : "Non renseignée"}
                  />
                  <ContextCard label="Ancienneté" value={seniority ?? "—"} />
                  <ContextCard
                    label="Grade / poste"
                    value={`${employee.grade} — ${employee.position || "—"}`}
                  />
                  <ContextCard label="Contrat" value={employee.contractType} />
                  <ContextCard label="Salaire de base mensuel" value={fmt(result.monthlyBase)} />
                  <ContextCard
                    label="Rémunération brute mensuelle"
                    value={fmt(result.monthlyGross)}
                  />
                  <ContextCard
                    label="Mode de travail"
                    value={`${result.workDaysPerMonth} j. / mois`}
                  />
                </>
              )}
            </div>
          </ScrollBlock>

          <ScrollBlock title="Décompte">
            <div className="flex h-full flex-col gap-3">
              <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2">
                <div className="flex min-h-0 flex-col gap-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">
                    Dû
                  </h5>
                  <AmountTable
                    lines={result.du.lines}
                    totalLabel="Total dû"
                    total={result.du.total}
                    fmt={fmt}
                    tone="du"
                  />
                </div>
                <div className="flex min-h-0 flex-col gap-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-red-400/90">
                    Retenues
                  </h5>
                  <AmountTable
                    lines={result.retenus.lines}
                    totalLabel="Total retenues"
                    total={result.retenus.total}
                    fmt={fmt}
                    tone="retenus"
                  />
                </div>
              </div>

              <div className="shrink-0 rounded-xl border-2 border-sky-500/35 bg-sky-500/10 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-300/90">
                      Net à payer — STC
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--shell-text-muted)]">
                      {fmt(result.du.total)} − {fmt(result.retenus.total)} = {fmt(result.netStc)}
                    </p>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-sky-300">
                    {fmt(result.netStc)}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[var(--shell-text-muted)]">
                Modèle démission / retraite : préavis et congés sur le salaire de base journalier
                uniquement ; jours prestés sur base + logement + transport. Retenues CNSS 5 % et
                IRPP 10 % sur le total dû.
              </p>
            </div>
          </ScrollBlock>
        </div>
      </div>

      <SoldeToutCompteInfoModal open={showInfo} onClose={() => setShowInfo(false)} />
    </>
  );
}
