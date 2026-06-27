"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { parseVehiculesWorkbook } from "@/lib/excel-import/parse-vehicule-workbook";
import type { VehiculeImportRow } from "@/lib/excel-import/vehicule-import.types";
import type { ImportRowResult } from "@/lib/excel-import/types";
import { cn } from "@/lib/utils";

async function downloadTemplate() {
  const res = await fetch("/api/charroi/vehicules/import");
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Téléchargement impossible");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? "modele_import_vehicules_charroi.xlsx";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CharroiVehiculeImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<VehiculeImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [results, setResults] = useState<ImportRowResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setRows([]);
    setResults([]);
    setProgress(0);
    setFileName(null);
    setError(null);
  }, []);

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setError(null);
    setResults([]);
    setProgress(0);
    setParsing(true);
    setFileName(file.name);
    try {
      const parsed = await parseVehiculesWorkbook(await file.arrayBuffer());
      setRows(parsed);
      if (parsed.length === 0) {
        setError(
          "Aucune ligne détectée. Utilisez le modèle avec les en-têtes MARQUE, PLAQUE, OBSERVATION TECH…"
        );
      }
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Lecture du fichier impossible.");
    } finally {
      setParsing(false);
    }
  }

  async function runImport() {
    if (!rows.length || importing) return;
    setImporting(true);
    setResults([]);
    setProgress(0);
    setError(null);

    const batch: ImportRowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const label = [row.plaque, row.marque].filter(Boolean).join(" · ") || row.marque;
      try {
        const res = await fetch("/api/charroi/vehicules/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });
        const data = (await res.json()) as ImportRowResult & { error?: string };
        if (!res.ok || !data.ok) {
          batch.push({
            line: row.line,
            ok: false,
            label,
            error: data.error ?? `Erreur HTTP ${res.status}`,
          });
        } else {
          batch.push({
            line: row.line,
            ok: true,
            label: data.label ?? label,
            id: data.id,
          });
        }
      } catch (e) {
        batch.push({
          line: row.line,
          ok: false,
          label,
          error: e instanceof Error ? e.message : "Erreur réseau",
        });
      }
      setProgress(i + 1);
      setResults([...batch]);
    }

    setImporting(false);
    if (batch.some((r) => r.ok)) onImported();
  }

  if (!open) return null;

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;
  const done = !importing && results.length > 0 && results.length === rows.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-bg)] shadow-xl">
        <div className="flex items-start justify-between border-b border-[var(--shell-border)] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--shell-text)]">
              Import Excel — parc véhicules
            </h3>
            <p className="mt-1 text-sm text-[var(--shell-text-muted)]">
              Modèle aligné sur la déclaration PPC / LOXEA (MARQUE, PLAQUE, ASSUREUR, OBSERVATION
              TECH…)
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="rounded-lg p-1 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Modèle Excel</h4>
                  <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
                    Téléchargez le fichier vierge avec les en-têtes attendus.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      void downloadTemplate().catch((e) =>
                        setError(e instanceof Error ? e.message : "Erreur téléchargement")
                      )
                    }
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Télécharger le modèle
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold">Importer un fichier rempli</h4>
                  <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
                    Compatible avec votre déclaration existante (en-tête détecté automatiquement).
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={importing || parsing}
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                    >
                      {parsing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Choisir un fichier
                    </button>
                    {rows.length > 0 && (
                      <button
                        type="button"
                        disabled={importing}
                        onClick={() => void runImport()}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        {importing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Importer {rows.length} ligne{rows.length !== 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                  {fileName && (
                    <p className="mt-2 truncate text-xs text-[var(--shell-text-muted)]">{fileName}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {(importing || done) && rows.length > 0 && (
            <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Progression</h4>
                <span className="text-xs text-[var(--shell-text-muted)]">
                  {progress} / {rows.length}
                  {done && (
                    <>
                      {" "}
                      — <span className="text-emerald-400">{successCount} inséré(s)</span>
                      {failCount > 0 && (
                        <>
                          {" "}
                          · <span className="text-red-400">{failCount} erreur(s)</span>
                        </>
                      )}
                    </>
                  )}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--shell-bg)]">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${rows.length ? (progress / rows.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--shell-border)]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[var(--shell-bg)] text-xs uppercase text-[var(--shell-text-muted)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Ligne</th>
                    <th className="px-3 py-2 font-medium">Véhicule</th>
                    <th className="px-3 py-2 font-medium">Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.line} className="border-t border-[var(--shell-border)]/60">
                      <td className="px-3 py-2 tabular-nums text-[var(--shell-text-muted)]">
                        {r.line}
                      </td>
                      <td className="px-3 py-2 text-[var(--shell-text)]">{r.label}</td>
                      <td className="px-3 py-2">
                        {r.ok ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Inséré
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {r.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-[var(--shell-border)] px-5 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className={cn(
              "rounded-lg border border-[var(--shell-border)] px-4 py-2 text-sm",
              importing && "opacity-50"
            )}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
