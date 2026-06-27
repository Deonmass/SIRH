"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SaveButton } from "@/components/ui/SaveButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { readApiError, showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import type { PointageDashboardData } from "@/lib/pointage-dashboard";
import type { PointageListRow } from "@/lib/types";
import { parseMoisAnnee } from "@/lib/pointage-utils";
import { PointagePeriodSelect } from "@/components/pointage/PointagePeriodSelect";

function presenceSummary(r: PointageListRow): string {
  const s = r.synthese;
  const joursSaisis = r.jours.length;
  const parts = [
    `${s.jours_presents} présent${s.jours_presents !== 1 ? "s" : ""}`,
    s.retards > 0 ? `${s.retards} retard${s.retards !== 1 ? "s" : ""}` : null,
    s.jours_maladie > 0 ? `${s.jours_maladie} maladie` : null,
    s.jours_conge > 0 ? `${s.jours_conge} congé` : null,
    s.jours_feries > 0 ? `${s.jours_feries} férié${s.jours_feries !== 1 ? "s" : ""}` : null,
    s.absences_non_justifiees > 0 ? `${s.absences_non_justifiees} abs. NJ` : null,
    s.heures_sup_total > 0 ? `${s.heures_sup_total} h sup.` : null,
  ].filter(Boolean);
  if (joursSaisis === 0) return "Aucune saisie";
  return `${parts.join(" · ")} — ${joursSaisis} jour${joursSaisis !== 1 ? "s" : ""} saisi${joursSaisis !== 1 ? "s" : ""}`;
}

function formatMontant(amount: number | undefined, currency?: string): string {
  if (amount == null) return "—";
  return `${Math.round(amount).toLocaleString("fr-FR")}${currency ? ` ${currency}` : ""}`;
}

export function PointageGestionClient() {
  const searchParams = useSearchParams();
  const now = new Date();
  const defaultMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const mois = searchParams.get("mois") ?? defaultMois;
  const { year, month } = parseMoisAnnee(mois);

  const [data, setData] = useState<PointageDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloturingAll, setCloturingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pointage/dashboard?year=${year}&month=${month}`);
      if (!res.ok) throw new Error(await readApiError(res));
      setData(await res.json());
    } catch (e) {
      showErrorAlert(e instanceof Error ? e.message : "Erreur chargement");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  async function cloturerTout() {
    setCloturingAll(true);
    try {
      const res = await fetch("/api/paie/cloture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moisAnnee: mois }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const result = (await res.json()) as { success: number; failed: number };
      showSuccessAlert(`${result.success} clôture(s) réussie(s)${result.failed ? `, ${result.failed} échec(s)` : ""}`);
      await load();
    } catch (e) {
      showErrorAlert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCloturingAll(false);
    }
  }

  const closableCount = rows.filter((r) => r.jours.length > 0 && !r.paieCloture).length;

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <div className="shrink-0">
        <PageHeader compact title="Feuilles du mois">
          <div className="flex flex-wrap items-center gap-2">
            <SaveButton
              icon={Wallet}
              saving={cloturingAll}
              disabled={closableCount === 0}
              onClick={() => void cloturerTout()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Clôturer tout ({closableCount})
            </SaveButton>
            <Link
              href={`/pointage/saisie?mois=${mois}`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--shell-border)] px-3 py-2 text-sm hover:bg-[var(--shell-hover)]"
            >
              <Plus className="h-4 w-4" />
              Saisir
            </Link>
          </div>
        </PageHeader>

        <div className="mb-4 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/60 p-4">
          <PointagePeriodSelect basePath="/pointage/gestion" />
        </div>

        {data && !loading && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Employés actifs", data.totalActifs],
              ["Feuilles saisies", data.feuillesSaisies],
              ["Pointage clôturé", data.feuillesVerrouillees],
              ["Moy. présents", data.avgJoursPresents],
            ].map(([label, val]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/50 px-4 py-3"
              >
                <p className="text-xs text-[var(--shell-text-muted)]">{label}</p>
                <p className="text-xl font-semibold tabular-nums">{val}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {loading ? (
          <Skeleton className="h-full min-h-[12rem] rounded-xl" />
        ) : (
          <div className="h-full overflow-x-hidden overflow-y-auto rounded-xl border border-[var(--shell-border)]">
            <table className="w-full min-w-0 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--shell-surface)] text-xs uppercase text-[var(--shell-text-muted)] shadow-[0_1px_0_0_var(--shell-border)]">
                <tr>
                  <th className="px-4 py-3">Employé</th>
                  <th className="px-4 py-3">Département</th>
                  <th className="px-4 py-3">Résumé des présences</th>
                  <th className="px-4 py-3 text-right">Net à payer</th>
                  <th className="px-4 py-3 text-right">Net + extra</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-[var(--shell-text-muted)]">
                      Aucun employé actif.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const clotured = Boolean(r.paieCloture);
                    return (
                      <tr
                        key={r.matriculeEmploye}
                        className="border-t border-[var(--shell-border)]/60 hover:bg-[var(--shell-hover)]/20"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">
                            {r.prenom} {r.nom}
                          </p>
                          <p className="text-xs text-[var(--shell-text-muted)]">{r.matriculeEmploye}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">{r.departement || "—"}</td>
                        <td className="max-w-md px-4 py-3 text-sm text-[var(--shell-text-muted)]">
                          {presenceSummary(r)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums">
                          {clotured ? (
                            <span className="font-medium text-[var(--shell-text)]">
                              {formatMontant(r.paieNet, r.paieCurrency)}
                            </span>
                          ) : (
                            <span className="text-[var(--shell-text-muted)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums">
                          {clotured ? (
                            <span className="font-medium text-emerald-400">
                              {formatMontant(r.paieTotalAvecExtras, r.paieCurrency)}
                            </span>
                          ) : (
                            <span className="text-[var(--shell-text-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
