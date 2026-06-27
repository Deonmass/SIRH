"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  FileSpreadsheet,
  FileText,
  Loader2,
  Presentation,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SaveButton } from "@/components/ui/SaveButton";
import { useAuth } from "@/contexts/AuthContext";
import { showErrorAlert } from "@/lib/alerts";
import type { ReportType } from "@/lib/reports/types";
import {
  RH_MODULE_REPORT_META,
  type RhModuleReportFocus,
} from "@/lib/reports/module-report-meta";
import { REPORT_SECTION_LABELS } from "@/lib/reports/report-narratives";
import { cn } from "@/lib/utils";

const REPORT_OPTIONS: {
  type: ReportType;
  label: string;
  description: string;
  icon: typeof FileText;
  tone: string;
}[] = [
  {
    type: "mensuel",
    label: "Mensuel",
    description: "Synthèse du mois : effectifs, paie, congés, pointage et conformité",
    icon: CalendarRange,
    tone: "border-sky-500/40 bg-sky-500/10",
  },
  {
    type: "semestriel",
    label: "Semestriel",
    description: "Bilan S1 ou S2 consolidé pour le comité de direction",
    icon: TrendingUp,
    tone: "border-violet-500/40 bg-violet-500/10",
  },
  {
    type: "annuel",
    label: "Annuel",
    description: "Évolution sur 12 mois, mouvements RH et masse salariale",
    icon: BarChart3,
    tone: "border-emerald-500/40 bg-emerald-500/10",
  },
  {
    type: "complet",
    label: "Complet",
    description: "Rapport intégral avec annexe détaillée des agents actifs",
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

export function RapportsClient({ moduleFocus }: { moduleFocus?: RhModuleReportFocus }) {
  const { can } = useAuth();
  const canExport = can("rapports", "export");
  const now = new Date();
  const moduleMeta = moduleFocus ? RH_MODULE_REPORT_META[moduleFocus] : null;

  const [selected, setSelected] = useState<ReportType>("mensuel");
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

      const res = await fetch(`/api/rapports/${selected}?${params}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Erreur ${res.status}`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] ??
        `rapport_rh_${selected}.${format === "excel" ? "xlsx" : format === "pptx" ? "pptx" : "pdf"}`;
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
        title={moduleMeta?.title ?? "Rapports RH"}
        description={
          moduleMeta?.description ??
          "Génération de rapports direction — Excel (formules), PDF et PowerPoint avec graphiques commentés"
        }
      />

      {moduleMeta && (
        <p className="mb-6 rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-sm text-[var(--shell-text-muted)]">
          <span className="font-medium text-[var(--shell-text)]">
            Section ciblée : {moduleMeta.sectionLabel}
          </span>
          {" — "}
          {moduleMeta.reportHint}
        </p>
      )}

      {!canExport && (
        <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Vous n&apos;avez pas la permission d&apos;exporter les rapports RH. Contactez un
          administrateur.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
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
            <p className="mt-1 text-xs text-[var(--shell-text-muted)] leading-relaxed">
              {opt.description}
            </p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--shell-text)]">Période & export</h2>
        <p className="mt-1 text-sm text-[var(--shell-text-muted)]">
          Les montants salariaux sont masqués si vous n&apos;avez pas la permission dédiée.
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

        <div className="mt-8 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 text-xs text-[var(--shell-text-muted)] space-y-2">
          <p className="font-semibold text-[var(--shell-text)]">Contenu des exports</p>
          <ul className="list-disc pl-5 space-y-1">
            {moduleMeta && (
              <li>
                <strong>{moduleMeta.sectionLabel}</strong> — section dédiée dans le PDF / PowerPoint (
                {REPORT_SECTION_LABELS[moduleMeta.sectionId]})
              </li>
            )}
            <li>
              <strong>Excel</strong> — onglets détaillés avec formules SUM/AVERAGE et totaux
              automatiques
            </li>
            <li>
              <strong>PDF</strong> — fond blanc, en-têtes bleu nuit ; chaque section sur 2 pages
              minimum (analyse + graphiques commentés)
            </li>
            <li>
              <strong>PowerPoint</strong> — présentation 16:9 professionnelle : couverture, KPI,
              2 slides par section (contexte + graphique), slide de clôture
            </li>
            <li>
              <strong>Annuel / Complet</strong> — onglet Mouvements ; annexe Agents (complet
              uniquement)
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
