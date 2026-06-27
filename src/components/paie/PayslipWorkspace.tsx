"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import type { AppSettings, PayslipTemplateConfig } from "@/lib/types";
import {
  applyPayslipPreset,
  DEFAULT_PAYSLIP_TEMPLATE,
  normalizePayslipTemplate,
  PAYSLIP_FONT_OPTIONS,
  PAYSLIP_LAYOUT_PRESETS,
  type PayslipLayoutPresetId,
} from "@/lib/payslip-template-default";
import { PAYSLIP_PREVIEW_SAMPLE, PAYSLIP_PREVIEW_SETTINGS } from "@/lib/payslip-preview-sample";
import { renderPayslipHtml } from "@/lib/payslip-html";
import { useOptionalAppSettings } from "@/contexts/SettingsContext";

export function PayslipWorkspace({
  settings: settingsProp,
}: {
  /** Paramètres serveur — requis si le contexte n'est pas encore monté (SSR). */
  settings: AppSettings;
}) {
  const context = useOptionalAppSettings();
  const appSettings = context?.settings ?? settingsProp;
  const [template, setTemplate] = useState<PayslipTemplateConfig>(DEFAULT_PAYSLIP_TEMPLATE);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/paie/template")
      .then((r) => r.json())
      .then((data) => setTemplate(normalizePayslipTemplate(data)))
      .catch(() => undefined);
  }, []);

  const previewHtml = useMemo(
    () =>
      renderPayslipHtml(
        PAYSLIP_PREVIEW_SAMPLE,
        template,
        {
          ...appSettings,
          companyName: appSettings.companyName || PAYSLIP_PREVIEW_SETTINGS.companyName,
          companyAddress: appSettings.companyAddress || PAYSLIP_PREVIEW_SETTINGS.companyAddress,
        },
        {
          assetBaseUrl: typeof window !== "undefined" ? window.location.origin : "",
        }
      ),
    [template, appSettings]
  );

  const saveTemplate = async () => {
    setSavingTemplate(true);
    setMessage(null);
    try {
      const res = await fetch("/api/paie/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (res.ok) {
        setMessage("Modèle enregistré.");
      } else {
        setMessage("Erreur lors de l'enregistrement du modèle.");
      }
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-700">
          {message}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="max-h-[calc(100vh-12rem)] space-y-5 overflow-y-auto rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-5">
          <div>
            <h3 className="font-semibold text-[var(--shell-text)]">Modèles visuels</h3>
            <p className="mt-1 text-xs text-[var(--shell-text-muted)]">
              Choisissez un style de base, puis ajustez couleurs et sections.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(Object.keys(PAYSLIP_LAYOUT_PRESETS) as PayslipLayoutPresetId[]).map((id) => {
                const preset = PAYSLIP_LAYOUT_PRESETS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTemplate((t) => applyPayslipPreset(t, id))}
                    className="rounded-xl border border-[var(--shell-border)] p-3 text-left transition hover:border-sky-500/50 hover:bg-sky-500/5"
                  >
                    <span
                      className="mb-2 block h-8 rounded-md border"
                      style={{
                        background: preset.config.headerBg ?? template.headerBg,
                        borderColor: preset.config.accentColor ?? template.accentColor,
                      }}
                    />
                    <span className="block text-xs font-semibold text-[var(--shell-text)]">
                      {preset.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[var(--shell-text-muted)]">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 border-t border-[var(--shell-border)] pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
              Contenu
            </h4>
            <Field label="Titre du bulletin">
              <input
                className="input w-full"
                value={template.title}
                onChange={(e) => setTemplate({ ...template, title: e.target.value })}
              />
            </Field>
            <Field label="Note de pied de page">
              <textarea
                className="input w-full"
                rows={3}
                value={template.footerNote}
                onChange={(e) => setTemplate({ ...template, footerNote: e.target.value })}
              />
            </Field>
          </div>

          <div className="space-y-3 border-t border-[var(--shell-border)] pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
              Typographie & mise en page
            </h4>
            <Field label="Police">
              <select
                className="input w-full"
                value={template.fontFamily}
                onChange={(e) => setTemplate({ ...template, fontFamily: e.target.value })}
              >
                {PAYSLIP_FONT_OPTIONS.map((f) => (
                  <option key={f.id} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Taille (${template.fontSize}px)`}>
                <input
                  type="range"
                  min={10}
                  max={16}
                  value={template.fontSize}
                  onChange={(e) => setTemplate({ ...template, fontSize: Number(e.target.value) })}
                  className="w-full"
                />
              </Field>
              <Field label={`Largeur max (${template.maxWidth}px)`}>
                <input
                  type="range"
                  min={600}
                  max={900}
                  step={10}
                  value={template.maxWidth}
                  onChange={(e) => setTemplate({ ...template, maxWidth: Number(e.target.value) })}
                  className="w-full"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Style en-tête">
                <select
                  className="input w-full"
                  value={template.headerStyle}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      headerStyle: e.target.value as PayslipTemplateConfig["headerStyle"],
                    })
                  }
                >
                  <option value="dark">Sombre</option>
                  <option value="accent">Couleur accent</option>
                  <option value="light">Clair</option>
                </select>
              </Field>
              <Field label="Style tableau">
                <select
                  className="input w-full"
                  value={template.tableStyle}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      tableStyle: e.target.value as PayslipTemplateConfig["tableStyle"],
                    })
                  }
                >
                  <option value="plain">Simple</option>
                  <option value="striped">Rayé</option>
                  <option value="bordered">Bordures</option>
                </select>
              </Field>
            </div>
            <Field label={`Coins arrondis (${template.borderRadius}px)`}>
              <input
                type="range"
                min={0}
                max={20}
                value={template.borderRadius}
                onChange={(e) =>
                  setTemplate({ ...template, borderRadius: Number(e.target.value) })
                }
                className="w-full"
              />
            </Field>
          </div>

          <div className="space-y-3 border-t border-[var(--shell-border)] pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
              Couleurs
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <ColorField
                label="Accent"
                value={template.accentColor}
                onChange={(v) => setTemplate({ ...template, accentColor: v })}
              />
              <ColorField
                label="En-tête"
                value={template.headerBg}
                onChange={(v) => setTemplate({ ...template, headerBg: v })}
              />
              <ColorField
                label="Texte en-tête"
                value={template.headerTextColor}
                onChange={(v) => setTemplate({ ...template, headerTextColor: v })}
              />
              <ColorField
                label="Bordures"
                value={template.borderColor}
                onChange={(v) => setTemplate({ ...template, borderColor: v })}
              />
              <ColorField
                label="Fond page"
                value={template.bodyBg}
                onChange={(v) => setTemplate({ ...template, bodyBg: v })}
              />
              <ColorField
                label="Texte"
                value={template.textColor}
                onChange={(v) => setTemplate({ ...template, textColor: v })}
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-[var(--shell-border)] pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
              Sections affichées
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <Toggle
                label="Situation salarié"
                checked={template.showSituation}
                onChange={(v) => setTemplate({ ...template, showSituation: v })}
              />
              <Toggle
                label="Pointage"
                checked={template.showPointage}
                onChange={(v) => setTemplate({ ...template, showPointage: v })}
              />
              <Toggle
                label="Bloc CNSS / DGI"
                checked={template.showCnssBlock}
                onChange={(v) => setTemplate({ ...template, showCnssBlock: v })}
              />
              <Toggle
                label="Logo société"
                checked={template.showCompanyLogo}
                onChange={(v) => setTemplate({ ...template, showCompanyLogo: v })}
              />
            </div>
            {!appSettings.companyLogoUrl && template.showCompanyLogo && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Aucun logo configuré — téléversez un fichier ou renseignez une URL dans Configuration → Entreprise.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[var(--shell-border)] pt-4">
            <button
              type="button"
              onClick={() => setTemplate(DEFAULT_PAYSLIP_TEMPLATE)}
              className="rounded-xl border border-[var(--shell-border)] px-4 py-2 text-xs font-medium hover:bg-[var(--shell-hover)]"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={() => void saveTemplate()}
              disabled={savingTemplate}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {savingTemplate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Enregistrer le template
            </button>
          </div>
        </div>

        <div className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-card)]">
          <div className="border-b border-[var(--shell-border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--shell-text)]">Aperçu en direct</h3>
            <p className="text-xs text-[var(--shell-text-muted)]">
              Bulletin exemple — les charges employeur ne figurent pas sur le bulletin salarié.
            </p>
          </div>
          <iframe
            title="Aperçu template bulletin"
            srcDoc={previewHtml}
            className="h-[640px] w-full flex-1 border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[var(--shell-text-muted)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-[var(--shell-text-muted)]">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="color-picker-solid mt-1 h-10 w-full cursor-pointer rounded-lg border border-[var(--shell-border)]"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--shell-border)] px-3 py-2 text-xs">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
