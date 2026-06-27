"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { parseImportWorkbookDetailed } from "@/lib/excel-import/parse-workbook";
import type {
  EmployeImportRow,
  ImportKind,
  ImportRowResult,
  PosteImportRow,
} from "@/lib/excel-import/types";
import { cn } from "@/lib/utils";

type ImportTab = "employes" | "postes";

async function downloadTemplate(kind: ImportKind) {
  const res = await fetch(`/api/import/template?kind=${kind}`);
  if (!res.ok) {
    let message = "Téléchargement du modèle impossible.";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      if (res.status === 403) message = "Accès refusé — permission Configuration requise.";
      else if (res.status === 401) message = "Session expirée — reconnectez-vous.";
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? "modele_import.xlsx";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExcelImportClient({ defaultTab = "employes" }: { defaultTab?: ImportTab }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ImportTab>(defaultTab);
  const [rows, setRows] = useState<(EmployeImportRow | PosteImportRow)[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [results, setResults] = useState<ImportRowResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const endpoint = tab === "employes" ? "/api/import/employes" : "/api/import/postes";

  const handleDownload = useCallback(async () => {
    setError(null);
    try {
      await downloadTemplate(tab === "employes" ? "employes" : "postes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur téléchargement.");
    }
  }, [tab]);

  const handleDownloadComplete = useCallback(async () => {
    setError(null);
    try {
      await downloadTemplate("complet");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur téléchargement.");
    }
  }, []);

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setError(null);
    setResults([]);
    setProgress(0);
    setParsing(true);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const { rows: parsed, meta } = await parseImportWorkbookDetailed(buffer, tab);
      setRows(parsed);
      if (parsed.length === 0) {
        if (tab === "employes" && meta.skippedLegacyExample) {
          setError(
            "Seule la ligne d'exemple (Jean Kabila) a été détectée — elle est ignorée. Remplacez-la par vos agents ou ajoutez des lignes à partir de la ligne 2, puis enregistrez le fichier."
          );
        } else {
          setError(
            tab === "employes"
              ? "Aucune ligne à importer. Remplissez la feuille « Employés » à partir de la ligne 2 (Prénom* et Nom* obligatoires), enregistrez, puis rechargez le fichier."
              : "Aucune ligne à importer. Remplissez la feuille « Postes » à partir de la ligne 2 (Intitulé* et Département* obligatoires), enregistrez, puis rechargez le fichier."
          );
        }
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
      const label =
        tab === "employes"
          ? `${(row as EmployeImportRow).prenom} ${(row as EmployeImportRow).nom}`.trim()
          : (row as PosteImportRow).intitule;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });
        const data = await res.json();
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
  }

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;
  const done = !importing && results.length > 0 && results.length === rows.length;

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-1">
        {(
          [
            { id: "employes" as const, label: "Agents" },
            { id: "postes" as const, label: "Postes" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={importing}
            onClick={() => {
              setTab(item.id);
              setRows([]);
              setResults([]);
              setProgress(0);
              setFileName(null);
              setError(null);
            }}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              tab === item.id
                ? "bg-sky-600 text-white shadow-sm"
                : "text-[var(--shell-text-muted)] hover:text-[var(--shell-text)]"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[var(--shell-text)]">
                Télécharger le modèle Excel
              </h3>
              <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
                {tab === "employes"
                  ? "Colonnes identiques au formulaire Nouvel employé (profil + coordonnées)."
                  : "Fichier postes avec en-têtes, exemple et instructions."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Modèle {tab === "employes" ? "agents" : "postes"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadComplete()}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--shell-border)] px-3 py-2 text-sm text-[var(--shell-text)] hover:bg-[var(--shell-bg)]"
                >
                  Modèle complet (2 feuilles)
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
              <Upload className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[var(--shell-text)]">
                Charger les données
              </h3>
              <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
                Sélectionnez votre fichier rempli — chaque ligne sera insérée une par une.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
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
                  Choisir un fichier Excel
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
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/80 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--shell-text)]">Progression</h3>
            <span className="text-xs text-[var(--shell-text-muted)]">
              {progress} / {rows.length}
              {done && (
                <>
                  {" "}
                  — <span className="text-emerald-400">{successCount} OK</span>
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
        <div className="max-h-80 overflow-y-auto rounded-xl border border-[var(--shell-border)]">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[var(--shell-bg)] text-xs uppercase text-[var(--shell-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Ligne</th>
                <th className="px-3 py-2 font-medium">Libellé</th>
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
  );
}
