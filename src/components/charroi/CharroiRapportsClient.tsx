"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  Car,
  FileSpreadsheet,
  FileText,
  Loader2,
  Presentation,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SaveButton } from "@/components/ui/SaveButton";
import { useAuth } from "@/contexts/AuthContext";
import { showErrorAlert } from "@/lib/alerts";
import type { CharroiReportType } from "@/lib/reports/charroi/types";
import { cn } from "@/lib/utils";

const REPORT_OPTIONS: {
  type: CharroiReportType;
  label: string;
  description: string;
  icon: typeof FileText;
  tone: string;
}[] = [
  {
    type: "mensuel",
    label: "Mensuel",
    description: "Parc, courses, pannes et entretien du mois sélectionné",
    icon: CalendarRange,
    tone: "border-sky-500/40 bg-sky-500/10",
  },
  {
    type: "semestriel",
    label: "Semestriel",
    description: "Bilan S1 ou S2 : mobilité, disponibilité et maintenance",
    icon: TrendingUp,
    tone: "border-violet-500/40 bg-violet-500/10",
  },
  {
    type: "annuel",
    label: "Annuel",
    description: "Vue consolidée sur 12 mois du charroi automobile",
    icon: BarChart3,
    tone: "border-emerald-500/40 bg-emerald-500/10",
  },
  {
    type: "complet",
    label: "Complet",
    description: "Rapport intégral avec listes détaillées (parc, courses, pannes, entretien)",
    icon: FileText,
    tone: "border-amber-500/40 bg-amber-500/10",
  },
];

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function CharroiRapportsClient() {
  const { can } = useAuth();
  const canExport = can("charroi.rapports", "export");
  const now = new Date();

  const [selected, setSelected] = useState<CharroiReportType>("mensuel");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [semester, setSemester] = useState<1 | 2>(now.getMonth() < 6 ? 1 : 2);
  const [exporting, setExporting] = useState<"excel" | "pdf" | "pptx" | null>(null);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y, y - 1, y - 2];
  }, [now]);

  async function download(format: "excel" | "pdf" | "pptx") {
    if (!canExport) return;
    setExporting(format);
    try {
      const params = new URLSearchParams({ format, year: String(year) });
      if (selected === "mensuel") params.set("month", String(month));
      if (selected === "semestriel") params.set("semester", String(semester));

      const res = await fetch(`/api/charroi/rapports/${selected}?${params}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Erreur ${res.status}`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] ??
        `rapport_charroi_${selected}.${format === "excel" ? "xlsx" : format === "pptx" ? "pptx" : "pdf"}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showErrorAlert(e instanceof Error ? e.message : "Export impossible");
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Rapports Charroi"
        description="Statistiques du parc automobile — véhicules, courses, pannes et entretien — export PDF, Excel et PowerPoint avec couverture personnalisée"
      />

      {!canExport && (
        <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Vous n&apos;avez pas la permission d&apos;exporter les rapports Charroi. Contactez un
          administrateur.
        </p>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {REPORT_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type="button"
            onClick={() => setSelected(opt.type)}
            className={cn(
              "rounded-2xl border p-5 text-left transition",
              selected === opt.type
                ? `${opt.tone} ring-2 ring-sky-500/50`
                : "border-[var(--shell-border)] bg-[var(--shell-card)] hover:border-sky-500/30"
            )}
          >
            <opt.icon
              className={cn(
                "mb-3 h-8 w-8",
                selected === opt.type ? "text-sky-400" : "text-[var(--shell-text-muted)]"
              )}
            />
            <h3 className="font-semibold text-[var(--shell-text)]">{opt.label}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--shell-text-muted)]">
              {opt.description}
            </p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--shell-text)]">Période & export</h2>
        <p className="mt-1 text-sm text-[var(--shell-text-muted)]">
          Le logo et le nom de l&apos;entreprise proviennent des paramètres Configuration →
          Entreprise.
        </p>

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

          {selected === "mensuel" && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--shell-text-muted)]">
                Mois
              </span>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="input min-w-[10rem]"
              >
                {MONTHS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selected === "semestriel" && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--shell-text-muted)]">
                Semestre
              </span>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value) as 1 | 2)}
                className="input min-w-[10rem]"
              >
                <option value={1}>1er semestre (janv. – juin)</option>
                <option value={2}>2e semestre (juil. – déc.)</option>
              </select>
            </label>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <SaveButton
            type="button"
            disabled={!canExport || exporting !== null}
            saving={exporting === "excel"}
            onClick={() => void download("excel")}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {exporting === "excel" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Exporter Excel
          </SaveButton>
          <SaveButton
            type="button"
            disabled={!canExport || exporting !== null}
            saving={exporting === "pdf"}
            onClick={() => void download("pdf")}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {exporting === "pdf" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Exporter PDF
          </SaveButton>
          <SaveButton
            type="button"
            disabled={!canExport || exporting !== null}
            saving={exporting === "pptx"}
            onClick={() => void download("pptx")}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {exporting === "pptx" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Presentation className="h-4 w-4" />
            )}
            Exporter PowerPoint
          </SaveButton>
        </div>

        <div className="mt-8 space-y-3 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 text-xs text-[var(--shell-text-muted)]">
          <p className="font-semibold text-[var(--shell-text)]">Contenu des exports</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex gap-2">
              <Car className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
              <span>
                <strong>Parc</strong> — total, répartition par statut, marque et type ; liste des
                véhicules disponibles
              </span>
            </div>
            <div className="flex gap-2">
              <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
              <span>
                <strong>Courses</strong> — demandes, affectations, chauffeurs, km parcourus sur la
                période
              </span>
            </div>
            <div className="flex gap-2">
              <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Pannes</strong> — déclarations et remises en service, véhicules hors
                service
              </span>
            </div>
            <div className="flex gap-2">
              <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <strong>Entretien</strong> — alertes km, historique des interventions sur la
                période
              </span>
            </div>
          </div>
          <p className="pt-2 border-t border-[var(--shell-border)]">
            Chaque export inclut une <strong>page de couverture</strong> avec le logo de la société,
            le titre du module Charroi et la période sélectionnée.
          </p>
        </div>
      </div>
    </>
  );
}
