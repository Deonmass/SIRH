import {
  configurationTitreForSection,
  DEFAULT_COMPANY_BRAND_PRIMARY,
  DEFAULT_COMPANY_BRAND_SECONDARY,
  normalizeEntrepriseSectionParams,
} from "@/lib/configuration-sections";
import { getConfigurationByTitre } from "@/lib/repositories/configuration";
import { getSettings } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { AppSettings } from "@/lib/types";
import { loadPdfLogoImage, pickCompanyLogoUrl, type PdfLogoImage } from "./pdf-logo-load";

export const DEFAULT_BRAND_PRIMARY = DEFAULT_COMPANY_BRAND_PRIMARY;
export const DEFAULT_BRAND_SECONDARY = DEFAULT_COMPANY_BRAND_SECONDARY;

export type { PdfLogoImage };

export type ReportBranding = {
  primary: [number, number, number];
  secondary: [number, number, number];
  primaryHex: string;
  secondaryHex: string;
  logo: PdfLogoImage | null;
};

export type EntrepriseReportSettings = Pick<
  AppSettings,
  "companyName" | "companyLogoUrl" | "companyBrandColor" | "companyBrandColorSecondary"
>;

export type ReportBrandingOptions = {
  /** Origine HTTP de l'app (ex. https://rh.example.com) pour charger /uploads/… */
  appOrigin?: string;
};

/** Lit la section Configuration « Entreprise » (nom, logo, couleurs). */
export async function loadEntrepriseSettingsForReport(): Promise<EntrepriseReportSettings> {
  const settings = await getSettings();
  let rowParams: Partial<AppSettings> | null = null;

  if (isSupabaseConfigured()) {
    try {
      const row = await getConfigurationByTitre(configurationTitreForSection("entreprise"));
      if (row?.params && typeof row.params === "object" && !Array.isArray(row.params)) {
        rowParams = row.params as Partial<AppSettings>;
      }
    } catch {
      /* fallback getSettings */
    }
  }

  const merged = rowParams ? { ...settings, ...rowParams } : settings;
  const normalized = normalizeEntrepriseSectionParams(merged);

  const companyLogoUrl = pickCompanyLogoUrl(
    rowParams?.companyLogoUrl,
    settings.companyLogoUrl,
    normalized.companyLogoUrl as string | undefined
  );

  return {
    companyName: String(normalized.companyName ?? settings.companyName),
    companyLogoUrl,
    companyBrandColor: String(normalized.companyBrandColor ?? DEFAULT_COMPANY_BRAND_PRIMARY),
    companyBrandColorSecondary: String(
      normalized.companyBrandColorSecondary ?? DEFAULT_COMPANY_BRAND_SECONDARY
    ),
  };
}

export function hexToRgb(hex: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!hex?.trim()) return fallback;
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function resolveReportBranding(
  settings: EntrepriseReportSettings,
  options?: ReportBrandingOptions
): Promise<ReportBranding> {
  const primaryHex = settings.companyBrandColor?.trim() || DEFAULT_BRAND_PRIMARY;
  const secondaryHex = settings.companyBrandColorSecondary?.trim() || DEFAULT_BRAND_SECONDARY;
  const primary = hexToRgb(primaryHex, [15, 23, 42]);
  const secondary = hexToRgb(secondaryHex, [14, 165, 233]);

  const logo = await loadPdfLogoImage(settings.companyLogoUrl, {
    appOrigin: options?.appOrigin,
  });

  return { primary, secondary, primaryHex, secondaryHex, logo };
}
