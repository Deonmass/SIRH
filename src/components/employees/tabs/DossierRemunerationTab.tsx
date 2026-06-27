"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PosteEditNavLink } from "@/components/postes/PosteEditNavLink";
import { v4 as uuidv4 } from "uuid";
import { HistoryTimelineView, PanelCard } from "../DossierDataViews";
import { DossierPaieTab } from "./DossierPaieTab";
import { DossierHeuresSupPanel } from "./DossierHeuresSupPanel";
import { DossierSoldeToutComptePanel } from "./DossierSoldeToutComptePanel";
import { PayrollSummaryCard } from "@/components/payroll/PayrollSummaryCard";
import { PayrollDualTotalsCards } from "@/components/payroll/PayrollDualTotalsCards";
import { SalarySimulator } from "@/components/payroll/SalarySimulator";
import { getEmployeeDossier } from "@/lib/employee-dossier";
import { mergePayrollWithEmployeeDependents } from "@/lib/payroll-simulator-config";
import { EXTRA_COST_LABELS, totalExtraCosts } from "@/lib/extra-costs";
import { resolveEmployeeExtraCosts } from "@/lib/extra-costs-resolve";
import type {
  AppSettings,
  Currency,
  Employee,
  EmployeeDossier,
  EmployeeExtraCosts,
  JobPosition,
  RemunerationHistoryEntry,
} from "@/lib/types";
import { useAppSettings } from "@/contexts/SettingsContext";
import { FolderTabs } from "@/components/layout/FolderTabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/utils";

type RemSubTab = "actuel" | "poste" | "extras" | "bulletins" | "heures_sup" | "solde";

export type RemunerationSubTab = RemSubTab;

const SUB_TABS: { id: RemSubTab; label: string }[] = [
  { id: "actuel", label: "Salaire actuel" },
  { id: "poste", label: "Salaire du poste" },
  { id: "extras", label: "Coûts extra" },
  { id: "bulletins", label: "Bulletins de paie" },
  { id: "heures_sup", label: "Heures supplémentaires" },
  { id: "solde", label: "Solde de tout compte" },
];

type SalaryHistoryRow = {
  id: string;
  date: string;
  amount: number;
  currency: Currency;
  label: string;
  source: string;
};

function RemunerationScrollColumn({
  title,
  description,
  children,
  headerAction,
  headerTrailing,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  /** Aligné en bas à droite du bloc titre (ex. sélecteur devise) */
  headerTrailing?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80">
      <div className="flex shrink-0 gap-2 border-b border-[var(--shell-border)] px-3 py-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--shell-text)]">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-[var(--shell-text-muted)]">{description}</p>
          )}
        </div>
        {(headerAction || headerTrailing) && (
          <div className="flex shrink-0 flex-col items-end justify-between self-stretch">
            {headerAction}
            {headerTrailing && <div className={headerAction ? "mt-auto" : ""}>{headerTrailing}</div>}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">{children}</div>
    </div>
  );
}

export function DossierRemunerationTab({
  employee,
  settings,
  onPatch,
  onPatchDossier,
  initialSubTab,
  onSubTabChange,
}: {
  employee: Employee;
  settings: AppSettings;
  view: import("../DossierViewToggle").DossierSectionView;
  onViewChange: (v: import("../DossierViewToggle").DossierSectionView) => void;
  onPatch: (data: Partial<Employee>) => void;
  onPatchDossier: (p: Partial<EmployeeDossier>) => void;
  showViewToggle?: boolean;
  initialSubTab?: RemSubTab;
  onSubTabChange?: (tab: RemSubTab) => void;
}) {
  const { formatSalary } = useAppSettings();
  const dossier = getEmployeeDossier(employee);
  const [subTab, setSubTab] = useState<RemSubTab>(initialSubTab ?? "actuel");
  const [linkedPosition, setLinkedPosition] = useState<JobPosition | null>(null);
  const [loadingPosition, setLoadingPosition] = useState(false);
  const [bulletinCurrency, setBulletinCurrency] = useState<Currency>(employee.salary.currency);
  const [bulletinCount, setBulletinCount] = useState(0);

  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab, employee.id]);

  function selectSubTab(next: RemSubTab) {
    setSubTab(next);
    onSubTabChange?.(next);
  }

  const history = dossier.remunerationHistory ?? [];
  const allowancesTotal = employee.salary.allowances.reduce((s, a) => s + a.amount, 0);
  const extraCosts = useMemo(
    () => resolveEmployeeExtraCosts(employee),
    [employee]
  );

  const salaryHistoryRows = useMemo((): SalaryHistoryRow[] => {
    const dossierIds = new Set(history.map((h) => h.id));
    const fromDossier: SalaryHistoryRow[] = history.map((h) => ({
      id: `dossier:${h.id}`,
      date: h.effectiveDate,
      amount: h.baseSalary,
      currency: h.currency,
      label: h.reason,
      source: "Historique dossier",
    }));
    const fromMovements: SalaryHistoryRow[] = employee.movements
      .filter((m) => m.toSalary != null && !dossierIds.has(m.id))
      .map((m) => ({
        id: `mouvement:${m.id}`,
        date: m.effectiveDate,
        amount: m.toSalary!,
        currency: employee.salary.currency,
        label: m.reason,
        source: m.type.replace(/_/g, " "),
      }));
    return [...fromDossier, ...fromMovements].sort((a, b) => b.date.localeCompare(a.date));
  }, [history, employee.movements, employee.salary.currency]);

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

  const effectivePositionPayroll = useMemo(() => {
    if (!linkedPosition) return null;
    return mergePayrollWithEmployeeDependents(linkedPosition.payroll, employee);
  }, [linkedPosition, employee]);

  const displayCurrency =
    effectivePositionPayroll?.currency ??
    linkedPosition?.payroll.currency ??
    employee.salary.currency;

  useEffect(() => {
    setBulletinCurrency(displayCurrency);
  }, [displayCurrency]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/paie/runs?matricule=${encodeURIComponent(employee.matricule)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: unknown[]) => {
        if (!cancelled) setBulletinCount(Array.isArray(rows) ? rows.length : 0);
      })
      .catch(() => {
        if (!cancelled) setBulletinCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [employee.matricule]);

  function addHistoryEntry() {
    const entry: RemunerationHistoryEntry = {
      id: uuidv4(),
      effectiveDate: new Date().toISOString().slice(0, 10),
      baseSalary: employee.salary.baseSalary,
      currency: employee.salary.currency,
      reason: "Snapshot rémunération actuelle",
      allowancesTotal,
    };
    onPatchDossier({ remunerationHistory: [...history, entry] });
  }

  function patchExtraCosts(patch: Partial<EmployeeExtraCosts>) {
    onPatch({
      extraCosts: { ...extraCosts, ...patch },
    });
  }

  const folderTabs = SUB_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    ...(t.id === "bulletins" ? { count: bulletinCount } : {}),
  }));

  return (
    <div className="space-y-0">
      <FolderTabs
        tabs={folderTabs}
        active={subTab}
        onChange={(id) => selectSubTab(id as RemSubTab)}
      />

      <div className="pt-4">
      {subTab === "actuel" && (
        <div className="space-y-4">
          {!employee.positionId && !loadingPosition && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
              Aucune fiche de poste liée — les montants proviennent du dossier employé.
            </p>
          )}

          <div className="grid h-[min(calc(100vh-14rem),44rem)] min-h-[24rem] gap-4 lg:grid-cols-3">
            <RemunerationScrollColumn
              title="Bulletin de paie"
              description="Avec le SMIG en vigueur"
              headerTrailing={
                effectivePositionPayroll ? (
                  <label className="flex items-center gap-1.5 text-xs text-[var(--shell-text-muted)]">
                    <span className="shrink-0">Devise</span>
                    <select
                      value={bulletinCurrency}
                      onChange={(e) => setBulletinCurrency(e.target.value as Currency)}
                      className="input min-w-[7rem] py-1 text-sm"
                      aria-label="Devise du bulletin"
                    >
                      <option value="CDF">CDF</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                ) : undefined
              }
            >
              {effectivePositionPayroll ? (
                <SalarySimulator
                  embedded
                  readOnly
                  stacked
                  bulletinOnly
                  compactTotals
                  hideCurrencySelector
                  displayCurrency={bulletinCurrency}
                  onDisplayCurrencyChange={setBulletinCurrency}
                  settings={settings}
                  params={settings}
                  payrollConfig={effectivePositionPayroll}
                />
              ) : loadingPosition ? (
                <div className="space-y-3 rounded-xl border border-[var(--shell-border)] p-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-48 w-full rounded-lg" />
                </div>
              ) : (
                <PayrollSummaryCard
                  embedded
                  title="Bulletin simulé"
                  salary={employee.salary}
                  extraCosts={extraCosts}
                  currency={displayCurrency}
                  showExtras={false}
                  showGrandTotal={false}
                />
              )}
            </RemunerationScrollColumn>

            <RemunerationScrollColumn
              title="Coûts extra"
              description="Indemnités hors bulletin"
            >
              <PayrollSummaryCard
                embedded
                showBulletin={false}
                showGrandTotal={false}
                positionPayroll={effectivePositionPayroll ?? undefined}
                salary={effectivePositionPayroll ? undefined : employee.salary}
                extraCosts={extraCosts}
                currency={displayCurrency}
                editableExtras
                onExtraCostsChange={patchExtraCosts}
              />
              {effectivePositionPayroll && (
                <div className="mt-2 border-t border-[var(--shell-border)] pt-2">
                  <PayrollDualTotalsCards
                    payrollConfig={effectivePositionPayroll}
                    extraCosts={extraCosts}
                    currency={displayCurrency}
                    compact
                  />
                </div>
              )}
            </RemunerationScrollColumn>

            <RemunerationScrollColumn
              title="Historique des modifications salariales"
              description="Augmentations, promotions et snapshots"
              headerAction={
                <button
                  type="button"
                  onClick={addHistoryEntry}
                  className="shrink-0 rounded-lg border border-sky-500/40 px-2.5 py-1 text-[11px] text-sky-500 hover:bg-sky-500/10"
                >
                  + Capturer
                </button>
              }
            >
              <HistoryTimelineView
                items={salaryHistoryRows.map((r) => ({
                  id: r.id,
                  date: formatDate(r.date),
                  amount: formatSalary(r.amount, r.currency),
                  badge: r.source,
                  title: r.label,
                }))}
                emptyMessage="Aucune modification enregistrée."
              />
            </RemunerationScrollColumn>
          </div>

          {!effectivePositionPayroll && !loadingPosition && (
            <p className="text-xs text-[var(--shell-text-muted)]">
              Affectez un poste via Mouvements pour aligner le bulletin sur le simulateur SMIG (pointage).
            </p>
          )}

          <p className="text-sm">
            <Link href="/paie/simulateur" className="text-sky-500 hover:underline">
              Simulateur de paie détaillé →
            </Link>
          </p>
        </div>
      )}

      {subTab === "poste" && (
        <div className="space-y-4">
          {!employee.positionId ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
              Aucune fiche de poste liée. Affectez l&apos;employé via Employés → Mouvements.
            </p>
          ) : loadingPosition ? (
            <div className="space-y-3 rounded-xl border border-[var(--shell-border)] p-4">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : linkedPosition ? (
            <>
              <div className="rounded-xl border border-[var(--shell-border)] px-4 py-3 text-sm">
                <p className="font-semibold text-[var(--shell-text)]">
                  {linkedPosition.code} — {linkedPosition.title}
                </p>
                <p className="text-xs text-[var(--shell-text-muted)]">
                  {linkedPosition.department} · {linkedPosition.grade}
                </p>
              </div>
              <SalarySimulator
                key={linkedPosition.id}
                embedded
                readOnly
                settings={settings}
                params={settings}
                payrollConfig={mergePayrollWithEmployeeDependents(
                  linkedPosition.payroll,
                  employee
                )}
              />
              <PosteEditNavLink
                posteId={linkedPosition.id}
                className="text-xs text-sky-500 hover:underline"
              >
                Modifier la fiche de poste →
              </PosteEditNavLink>
            </>
          ) : (
            <p className="text-sm text-rose-400/90">Fiche de poste introuvable.</p>
          )}
        </div>
      )}

      {subTab === "extras" && (
        <div className="space-y-6">
          <p className="text-sm text-[var(--shell-text-muted)]">
            Indemnités et frais mensuels hors bulletin (en plus du net à payer).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              ["housing", "mileage", "childrenEducation", "travel", "variables"] as const
            ).map((field) => (
              <label key={field} className="text-xs text-[var(--shell-text-muted)]">
                {EXTRA_COST_LABELS[field]}
                <input
                  type="number"
                  min={0}
                  value={extraCosts[field] ?? 0}
                  onChange={(e) =>
                    patchExtraCosts({ [field]: Number(e.target.value) || 0 })
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm text-[var(--shell-text)]"
                />
              </label>
            ))}
            <label className="text-xs text-[var(--shell-text-muted)]">
              Devise
              <select
                value={extraCosts.currency}
                onChange={(e) => patchExtraCosts({ currency: e.target.value as Currency })}
                className="mt-1 w-full rounded-lg border border-[var(--shell-input-border)] bg-[var(--shell-input-bg)] px-3 py-2 text-sm text-[var(--shell-text)]"
              >
                <option value="USD">USD</option>
                <option value="CDF">CDF</option>
              </select>
            </label>
          </div>
          <PanelCard>
            <p className="text-[10px] uppercase text-[var(--shell-text-muted)]">Total coûts extra</p>
            <p className="mt-1 text-2xl font-bold text-amber-500">
              {formatSalary(totalExtraCosts(extraCosts), extraCosts.currency)}
            </p>
          </PanelCard>
        </div>
      )}

      {subTab === "bulletins" && (
        <DossierPaieTab employee={employee} settings={settings} />
      )}

      {subTab === "heures_sup" && (
        <DossierHeuresSupPanel
          employee={employee}
          settings={settings}
          positionPayroll={effectivePositionPayroll}
          onRecordsChange={(records) => onPatch({ overtimeMonthlyRecords: records })}
        />
      )}

      {subTab === "solde" && (
        <DossierSoldeToutComptePanel employee={employee} settings={settings} />
      )}
      </div>
    </div>
  );
}
