import type { PayslipLayout, PayslipTemplateConfig } from "./types";

export const PAYSLIP_FONT_OPTIONS = [
  { id: "system", label: "Système", value: "system-ui, -apple-system, sans-serif" },
  { id: "serif", label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "Monospace", value: "'Courier New', Courier, monospace" },
  { id: "arial", label: "Arial", value: "Arial, Helvetica, sans-serif" },
] as const;

export const DEFAULT_PAYSLIP_TEMPLATE: PayslipTemplateConfig = {
  title: "BULLETIN DE PAIE",
  accentColor: "#0284c7",
  headerBg: "#0f172a",
  borderColor: "#cbd5e1",
  bodyBg: "#ffffff",
  textColor: "#0f172a",
  headerTextColor: "#38bdf8",
  footerNote:
    "Document établi conformément au Code du travail RDC (Loi 015/2002). Conservez ce bulletin pour vos déclarations.",
  layout: "classic",
  tableStyle: "plain",
  headerStyle: "dark",
  fontFamily: "system-ui, -apple-system, sans-serif",
  fontSize: 13,
  borderRadius: 8,
  maxWidth: 720,
  showSituation: true,
  showPointage: true,
  showCnssBlock: true,
  showCompanyLogo: true,
};

export type PayslipLayoutPresetId = "classic" | "modern" | "minimal" | "compact" | "corporate";

export const PAYSLIP_LAYOUT_PRESETS: Record<
  PayslipLayoutPresetId,
  { label: string; description: string; config: Partial<PayslipTemplateConfig> }
> = {
  classic: {
    label: "Classique",
    description: "En-tête sombre, bordure nette",
    config: {
      layout: "classic",
      headerStyle: "dark",
      headerBg: "#0f172a",
      headerTextColor: "#38bdf8",
      accentColor: "#0284c7",
      borderColor: "#cbd5e1",
      bodyBg: "#ffffff",
      textColor: "#0f172a",
      tableStyle: "plain",
      borderRadius: 8,
      fontSize: 13,
    },
  },
  modern: {
    label: "Moderne",
    description: "Bandeau accent, coins arrondis",
    config: {
      layout: "modern",
      headerStyle: "accent",
      headerBg: "#0284c7",
      headerTextColor: "#ffffff",
      accentColor: "#0284c7",
      borderColor: "#e2e8f0",
      bodyBg: "#ffffff",
      textColor: "#1e293b",
      tableStyle: "striped",
      borderRadius: 14,
      fontSize: 13,
    },
  },
  minimal: {
    label: "Minimal",
    description: "Épuré, sans bordure lourde",
    config: {
      layout: "minimal",
      headerStyle: "light",
      headerBg: "#f8fafc",
      headerTextColor: "#0369a1",
      accentColor: "#0369a1",
      borderColor: "#e2e8f0",
      bodyBg: "#ffffff",
      textColor: "#334155",
      tableStyle: "plain",
      borderRadius: 0,
      fontSize: 12,
    },
  },
  compact: {
    label: "Compact",
    description: "Dense, idéal pour l'impression",
    config: {
      layout: "compact",
      headerStyle: "dark",
      headerBg: "#1e293b",
      headerTextColor: "#7dd3fc",
      accentColor: "#0ea5e9",
      borderColor: "#94a3b8",
      bodyBg: "#ffffff",
      textColor: "#0f172a",
      tableStyle: "bordered",
      borderRadius: 4,
      fontSize: 11,
      maxWidth: 680,
    },
  },
  corporate: {
    label: "Corporate",
    description: "Tableau structuré, ton professionnel",
    config: {
      layout: "classic",
      headerStyle: "light",
      headerBg: "#f1f5f9",
      headerTextColor: "#1d4ed8",
      accentColor: "#1d4ed8",
      borderColor: "#64748b",
      bodyBg: "#ffffff",
      textColor: "#0f172a",
      tableStyle: "bordered",
      borderRadius: 6,
      fontSize: 12,
    },
  },
};

/** Fusionne une config sauvegardée avec les valeurs par défaut (rétrocompatibilité). */
export function normalizePayslipTemplate(
  raw: Partial<PayslipTemplateConfig> & { showEmployerCharges?: boolean } | null | undefined
): PayslipTemplateConfig {
  if (!raw) return { ...DEFAULT_PAYSLIP_TEMPLATE };
  const { showEmployerCharges: _ignored, ...rest } = raw;
  return { ...DEFAULT_PAYSLIP_TEMPLATE, ...rest };
}

export function applyPayslipPreset(
  current: PayslipTemplateConfig,
  presetId: PayslipLayoutPresetId
): PayslipTemplateConfig {
  const preset = PAYSLIP_LAYOUT_PRESETS[presetId];
  return normalizePayslipTemplate({
    ...current,
    ...preset.config,
  });
}
