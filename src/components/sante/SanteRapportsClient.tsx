"use client";

import { useMemo, useState } from "react";
import { CalendarRange, FileSpreadsheet, HeartPulse, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SaveButton } from "@/components/ui/SaveButton";
import { useAuth } from "@/contexts/AuthContext";
import { showErrorAlert } from "@/lib/alerts";
import { MOIS_FR_OPTIONS } from "@/lib/pointage-utils";

export function SanteRapportsClient() {
  const { can } = useAuth();
  const canExport = can("rapports", "export");
  const now = useMemo(() => new Date(), []);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | "">(now.getMonth() + 1);
  const [exporting, setExporting] = useState(false);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y, y - 1, y - 2];
  }, [now]);

  async function downloadExcel() {
    if (!canExport) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ format: "excel", year: String(year) });
      if (month !== "") params.set("month", String(month));
      const res = await fetch(`/api/sante/rapports?${params}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Erreur ${res.status}`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `rapport_sante_${year}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showErrorAlert(e instanceof Error ? e.message : "Export impossible");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Rapports Santé"
        description="Visites médicales, montants et validations — export Excel avec synthèse et détail des visites"
      />

      {!canExport && (
        <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Vous n&apos;avez pas la permission d&apos;exporter les rapports. Contactez un
          administrateur.
        </p>
      )}

      <div className="mb-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
        <div className="flex items-start gap-3">
          <HeartPulse className="mt-0.5 h-8 w-8 shrink-0 text-rose-400" />
          <div>
            <h3 className="font-semibold text-[var(--shell-text)]">Rapport visites & soins</h3>
            <p className="mt-1 text-sm text-[var(--shell-text-muted)]">
              KPI (visites, montants, validations), top hôpitaux et liste détaillée des visites sur
              la période sélectionnée.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--shell-text)]">
          <CalendarRange className="h-5 w-5 text-sky-500" />
          Période & export
        </h2>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--shell-text-muted)]">
              Année
            </span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="input min-w-[7rem]"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--shell-text-muted)]">
              Mois
            </span>
            <select
              value={month}
              onChange={(e) =>
                setMonth(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="input min-w-[10rem]"
            >
              <option value="">Tous (année)</option>
              {MOIS_FR_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-8">
          <SaveButton
            type="button"
            disabled={!canExport || exporting}
            saving={exporting}
            onClick={() => void downloadExcel()}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Exporter Excel
          </SaveButton>
        </div>
      </div>
    </>
  );
}
