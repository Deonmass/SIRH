"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Link2, Loader2, Trash2, Upload } from "lucide-react";
import type { SettingsBundle } from "@/contexts/SettingsContext";
import { companyLogoDisplaySrc, isExternalLogoUrl, isValidCompanyLogoRef } from "@/lib/company-logo";
import { cn } from "@/lib/utils";

type LogoMode = "upload" | "url";

function initialMode(logoUrl?: string): LogoMode {
  return isExternalLogoUrl(logoUrl) ? "url" : "upload";
}

type LogoApiResponse = SettingsBundle & {
  companyLogoUrl?: string;
  error?: string;
};

export function CompanyLogoField({
  logoUrl,
  companyName,
  onSaved,
}: {
  logoUrl?: string;
  companyName: string;
  /** Appelé après persistance serveur réussie (settings + revision à jour). */
  onSaved: (bundle: SettingsBundle) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<LogoMode>(() => initialMode(logoUrl));
  const [urlDraft, setUrlDraft] = useState(
    isExternalLogoUrl(logoUrl) ? (logoUrl ?? "") : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode(logoUrl));
    if (isExternalLogoUrl(logoUrl)) {
      setUrlDraft(logoUrl ?? "");
    }
  }, [logoUrl]);

  const previewSrc = companyLogoDisplaySrc(logoUrl, "");

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: form });
      const data = (await res.json()) as LogoApiResponse;
      if (!res.ok) {
        setError(data.error ?? "Échec du téléversement");
        return;
      }
      if (data.settings && data.revision) {
        onSaved({ settings: data.settings, revision: data.revision });
      }
      setMode("upload");
    } finally {
      setBusy(false);
    }
  }

  async function applyUrl() {
    const url = urlDraft.trim();
    if (!isValidCompanyLogoRef(url) || url.startsWith("/uploads/")) {
      setError("URL invalide — exemple : https://example.com/logo.png");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/logo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as LogoApiResponse;
      if (!res.ok) {
        setError(data.error ?? "Impossible d'enregistrer l'URL");
        return;
      }
      if (data.settings && data.revision) {
        onSaved({ settings: data.settings, revision: data.revision });
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/logo", { method: "DELETE" });
      const data = (await res.json()) as LogoApiResponse;
      if (!res.ok) {
        setError("Impossible de supprimer le logo");
        return;
      }
      setUrlDraft("");
      if (data.settings && data.revision) {
        onSaved({ settings: data.settings, revision: data.revision });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col-span-2 sm:col-span-8 lg:col-span-8">
      <span className="text-xs text-slate-400">Logo de la société</span>
      <div className="mt-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
        <div className="mb-4 flex gap-1 rounded-lg border border-[var(--shell-border)] p-1">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition",
              mode === "upload"
                ? "bg-sky-600 text-white"
                : "text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            Chargement
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition",
              mode === "url"
                ? "bg-sky-600 text-white"
                : "text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)]"
            )}
          >
            <Link2 className="h-3.5 w-3.5" />
            URL
          </button>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <div
            className={cn(
              "flex h-20 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--shell-border)]",
              previewSrc ? "bg-transparent" : "bg-[var(--shell-surface)]"
            )}
          >
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt={`Logo ${companyName}`}
                className="max-h-16 max-w-[7rem] object-contain"
                onError={() => setError("Impossible de charger l'aperçu du logo")}
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-[var(--shell-text-muted)]" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            {mode === "upload" ? (
              <>
                <p className="text-sm text-[var(--shell-text-muted)]">
                  Téléversez une image depuis votre ordinateur (PNG, JPEG, WebP, SVG — max 2 Mo). Préférez un fond transparent.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {logoUrl && !isExternalLogoUrl(logoUrl) ? "Remplacer le fichier" : "Choisir un fichier"}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--shell-text-muted)]">
                  Indiquez l&apos;adresse publique du logo (http:// ou https://).
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="url"
                    value={urlDraft}
                    onChange={(e) => {
                      setUrlDraft(e.target.value);
                      setError(null);
                    }}
                    placeholder="https://…/logo.png"
                    className="input min-w-[12rem] flex-1"
                  />
                  <button
                    type="button"
                    disabled={busy || !urlDraft.trim()}
                    onClick={() => void applyUrl()}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Enregistrer l&apos;URL
                  </button>
                </div>
              </>
            )}

            {logoUrl && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer le logo
              </button>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
