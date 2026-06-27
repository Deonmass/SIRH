import type { PdfLogoImage, ReportBranding } from "./pdf-branding";
import { hexToRgb } from "./pdf-branding";

export type Rgb = [number, number, number];

export type BrandPalette = {
  primary: Rgb;
  secondary: Rgb;
  primaryDark: Rgb;
  secondaryDeep: Rgb;
  primaryHex: string;
  secondaryHex: string;
  primaryDarkHex: string;
  secondaryDeepHex: string;
  ice: Rgb;
  iceHex: string;
  white: Rgb;
  whiteHex: string;
  slate: Rgb;
  slateHex: string;
  muted: Rgb;
  mutedHex: string;
  border: Rgb;
  borderHex: string;
  onPrimary: Rgb;
  onPrimaryMuted: Rgb;
  onPrimaryHex: string;
  onPrimaryMutedHex: string;
  logo: PdfLogoImage | null;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function rgbToHex(rgb: Rgb): string {
  return rgb.map((c) => clamp(c).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function pptxHex(hex: string): string {
  return hex.replace("#", "").toUpperCase();
}

export function darkenRgb(rgb: Rgb, amount = 14): Rgb {
  return rgb.map((c) => clamp(c - amount)) as Rgb;
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return a.map((v, i) => clamp(v * (1 - t) + b[i] * t)) as Rgb;
}

/** Fond carte très clair teinté par la couleur primaire. */
export function tintSurface(primary: Rgb, strength = 0.07): Rgb {
  return mixRgb([255, 255, 255], primary, strength);
}

export function buildBrandPalette(branding: ReportBranding): BrandPalette {
  const primary = branding.primary;
  const secondary = branding.secondary;
  const primaryDark = darkenRgb(primary, 18);
  const secondaryDeep = darkenRgb(secondary, 24);
  const ice = tintSurface(primary, 0.08);
  const slate: Rgb = [51, 65, 85];
  const muted: Rgb = [100, 116, 139];
  const border: Rgb = mixRgb(tintSurface(primary, 0.12), [203, 213, 225], 0.5);

  return {
    primary,
    secondary,
    primaryDark,
    secondaryDeep,
    primaryHex: pptxHex(branding.primaryHex),
    secondaryHex: pptxHex(branding.secondaryHex),
    primaryDarkHex: rgbToHex(primaryDark),
    secondaryDeepHex: rgbToHex(secondaryDeep),
    ice,
    iceHex: rgbToHex(ice),
    white: [255, 255, 255],
    whiteHex: "FFFFFF",
    slate,
    slateHex: rgbToHex(slate),
    muted,
    mutedHex: rgbToHex(muted),
    border,
    borderHex: rgbToHex(border),
    onPrimary: [255, 255, 255],
    onPrimaryMuted: mixRgb([255, 255, 255], secondary, 0.35),
    onPrimaryHex: "FFFFFF",
    onPrimaryMutedHex: rgbToHex(mixRgb([255, 255, 255], secondary, 0.35)),
    logo: branding.logo,
  };
}

/** Palette neutre si branding absent (tests). */
export function defaultBrandPalette(): BrandPalette {
  return buildBrandPalette({
    primary: hexToRgb("#0F172A", [15, 23, 42]),
    secondary: hexToRgb("#0EA5E9", [14, 165, 233]),
    primaryHex: "#0F172A",
    secondaryHex: "#0EA5E9",
    logo: null,
  });
}

export function truncateSlideText(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
