"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { TableSkeleton } from "@/components/ui/PageSkeletons";
import type { PaieMasseBreakdown } from "@/lib/types";
import type {
  PaieMasseEmployeeLine,
  PaieMasseMetricKey,
} from "@/lib/paie-masse";
import {
  PAIE_METRIC_LABELS,
  masseMetricValue,
  metricAmountForEmployee,
} from "@/lib/paie-masse";

type DetailPayload = {
  period: string;
  masse: PaieMasseBreakdown;
  employees: PaieMasseEmployeeLine[];
};

export function PaieMasseDetailModal({
  open,
  onClose,
  period,
  metric,
  departmentFilter,
  title,
}: {
  open: boolean;
  onClose: () => void;
  period: string;
  metric: PaieMasseMetricKey;
  departmentFilter?: string;
  title?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setLoading(true);
    fetch(`/api/paie/masse/detail?period=${encodeURIComponent(period)}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [open, period]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const allRows = useMemo(() => {
    if (!data) return [];
    let list = data.employees;
    if (departmentFilter) {
      list = list.filter((e) => e.department === departmentFilter);
    }
    return list.map((line) => ({
      line,
      amount: metricAmountForEmployee(line, metric),
    }));
  }, [data, departmentFilter, metric]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(({ line }) => {
      const haystack = `${line.fullName} ${line.matricule}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [allRows, search]);

  const filteredSum = rows.reduce((s, r) => s + r.amount, 0);
  const cardTotal =
    data?.masse && !search.trim()
      ? masseMetricValue(data.masse, metric, departmentFilter)
      : filteredSum;
  const total = search.trim() ? filteredSum : cardTotal;
  const currency = data?.masse.currency ?? "USD";
  const modalTitle = title ?? PAIE_METRIC_LABELS[metric];

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="paie-detail-backdrop fixed inset-0 z-[9998] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        className="paie-detail-modal flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="paie-detail-modal__header shrink-0 border-b border-[var(--shell-border)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--shell-text)]">{modalTitle}</h2>
              <p className="text-xs text-[var(--shell-text-muted)]">
                {data?.masse.periodLabel ?? period}
                {departmentFilter ? ` · ${departmentFilter}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {!loading && allRows.length > 0 && (
            <label className="relative mt-4 flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--shell-text-muted)]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou matricule…"
                className="input w-full pl-9"
                autoFocus
              />
            </label>
          )}
        </header>

        <div className="paie-detail-modal__body flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <TableSkeleton rows={8} cols={4} />
          ) : allRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--shell-text-muted)]">
              Aucune donnée pour cette période. Archivez des bulletins ou sélectionnez le mois en cours.
            </p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--shell-text-muted)]">
              Aucun employé ne correspond à « {search} ».
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--shell-border)] text-xs uppercase text-[var(--shell-text-muted)]">
                  <th className="pb-2 pr-2 font-semibold">Employé</th>
                  <th className="pb-2 pr-2 font-semibold">Matricule</th>
                  <th className="pb-2 pr-2 font-semibold">Département</th>
                  <th className="pb-2 text-right font-semibold">Montant</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ line, amount }) => (
                  <tr
                    key={line.employeeId}
                    className="border-b border-[var(--shell-border)]/60 last:border-0"
                  >
                    <td className="py-2.5 pr-2">
                      <p className="font-medium text-[var(--shell-text)]">{line.fullName}</p>
                      <p className="text-[10px] text-[var(--shell-text-muted)]">{line.position}</p>
                    </td>
                    <td className="py-2.5 pr-2 font-mono text-xs text-[var(--shell-text-muted)]">
                      {line.matricule}
                    </td>
                    <td className="py-2.5 pr-2 text-[var(--shell-text-muted)]">{line.department}</td>
                    <td className="py-2.5 text-right tabular-nums font-medium text-[var(--shell-text)]">
                      {metric === "employeeCount"
                        ? "—"
                        : `${amount.toLocaleString("fr-FR")} ${currency}`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--shell-border)]">
                  <td colSpan={3} className="pt-3 font-semibold text-[var(--shell-text)]">
                    Total ({rows.length} employé{rows.length > 1 ? "s" : ""}
                    {search.trim() && allRows.length !== rows.length
                      ? ` sur ${allRows.length}`
                      : ""}
                    )
                  </td>
                  <td className="pt-3 text-right text-base font-bold tabular-nums text-sky-600">
                    {metric === "employeeCount"
                      ? rows.length
                      : `${total.toLocaleString("fr-FR")} ${currency}`}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
