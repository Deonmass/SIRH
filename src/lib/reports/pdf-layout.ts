import type { jsPDF } from "jspdf";
import type { PdfLogoImage } from "./pdf-branding";
import { fitLogoBox } from "./pdf-logo-load";
import { mapTextStyleToPdf, PDF_FONT, setPdfFont } from "./pdf-fonts";
import { THEME } from "./report-theme";

/** Marges A4 — tout le contenu reste dans la zone utile */
export const PDF_PAGE = {
  marginX: 14,
  marginRight: 14,
  headerBandH: 28,
  footerH: 12,
  contentTop: 34,
  /** Y max avant le pied de page (A4 ≈ 297 mm) */
  contentBottom: 272,
  /** @deprecated Préférer pdfLineHeightMm */
  lineHeightFactor: 0.42,
} as const;

/** jsPDF utilise des pt ; positions Y en mm — interligne lisible (~1.35). */
export function pdfLineHeightMm(fontSizePt: number, spacing = 1.35): number {
  return fontSizePt * 0.352778 * spacing;
}

/** Hauteur totale d'un bloc multiligne. */
export function pdfBlockHeightMm(lineCount: number, fontSizePt: number, spacing = 1.35): number {
  if (lineCount <= 0) return 0;
  return lineCount * pdfLineHeightMm(fontSizePt, spacing);
}

export function contentWidth(pageW: number): number {
  return pageW - PDF_PAGE.marginX - PDF_PAGE.marginRight;
}

export function grid2x2(pageW: number) {
  const w = contentWidth(pageW);
  const gap = 5;
  const cardW = (w - gap) / 2;
  const cardH = 62;
  return { gap, cardW, cardH, w };
}

/**
 * Nettoie le texte avant rendu jsPDF.
 * Les espaces insécables / fines (Intl fr-CD) forcent l'encodage UTF-16 et provoquent
 * l'affichage « L a m a s s e » lettre par lettre dans le PDF.
 */
export function normalizePdfText(text: string): string {
  return String(text)
    .normalize("NFC")
    .replace(/[\u00A0\u202F\u2007\u2009\u200A\u200B\u200C\u200D\uFEFF]/g, " ")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export type TextStyle = {
  style?: "normal" | "bold" | "italic";
  fontSize: number;
  color?: [number, number, number];
  gap?: number;
};

const DEFAULT_TEXT: TextStyle = {
  style: "normal",
  fontSize: 9,
  color: THEME.slate,
  gap: 2,
};

export function applyTextStyle(pdf: jsPDF, style: TextStyle) {
  setPdfFont(pdf, mapTextStyleToPdf(style.style));
  pdf.setFontSize(style.fontSize);
  pdf.setTextColor(...(style.color ?? THEME.slate));
}

/** Texte multiligne dans la marge — retourne le Y après le bloc */
export function drawWrappedText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  style: Partial<TextStyle> = {}
): number {
  const s = { ...DEFAULT_TEXT, ...style };
  applyTextStyle(pdf, s);
  const safe = normalizePdfText(text);
  const lines = pdf.splitTextToSize(safe, maxW) as string[];
  const lh = pdfLineHeightMm(s.fontSize);
  if (lines.length) {
    lines.forEach((line, i) => {
      pdf.text(line, x, y + i * lh);
    });
  }
  return y + lines.length * lh + (s.gap ?? 2);
}

export function truncateLabel(label: string, max = 14): string {
  const t = normalizePdfText(label);
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function fitCellText(
  pdf: jsPDF,
  text: string,
  maxW: number,
  fontSize = 7
): string {
  setPdfFont(pdf, "normal");
  pdf.setFontSize(fontSize);
  const s = normalizePdfText(text);
  if (pdf.getTextWidth(s) <= maxW) return s;
  let out = s;
  while (out.length > 1 && pdf.getTextWidth(`${out}…`) > maxW) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

/** Lignes découpées pour titres / bandeaux (police Calibri déjà active). */
export function splitPdfLines(pdf: jsPDF, text: string, maxW: number): string[] {
  return pdf.splitTextToSize(normalizePdfText(text), maxW) as string[];
}

/** Dessine un bloc multiligne à Y fixe, retourne Y final. */
export function drawPdfLines(
  pdf: jsPDF,
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
  spacing = 1.35
): number {
  const lh = pdfLineHeightMm(fontSize, spacing);
  lines.forEach((line, i) => {
    pdf.text(line, x, y + i * lh);
  });
  return y + lines.length * lh;
}

/** Bandeau navy en tête de page — hauteur dynamique selon le texte. */
export function drawReportTopBand(
  pdf: jsPDF,
  pageW: number,
  brand: {
    navy: [number, number, number];
    accent: [number, number, number];
  },
  title: string,
  subtitle?: string,
  headerLogo?: PdfLogoImage | null
): number {
  const mx0 = PDF_PAGE.marginX;
  let logoReserve = 0;
  if (headerLogo) {
    try {
      const { w: logoW } = fitLogoBox(headerLogo, 24, 14);
      logoReserve = logoW + 5;
    } catch {
      /* ignore */
    }
  }

  const textW = Math.max(40, contentWidth(pageW) - logoReserve);
  const titleSize = 14;
  const subSize = 9;
  const titleLines = splitPdfLines(pdf, title, textW);
  const subLines = subtitle ? splitPdfLines(pdf, subtitle, textW) : [];
  const bandH = Math.max(
    subtitle ? 30 : 24,
    12 +
      pdfBlockHeightMm(titleLines.length, titleSize) +
      (subLines.length ? 3 + pdfBlockHeightMm(subLines.length, subSize) : 0) +
      4
  );

  pdf.setFillColor(...brand.navy);
  pdf.rect(0, 0, pageW, bandH, "F");
  pdf.setFillColor(...brand.accent);
  pdf.rect(0, 0, 3, bandH, "F");

  let mx = mx0;
  if (headerLogo) {
    try {
      const { w: logoW, h: logoH } = fitLogoBox(headerLogo, 24, Math.min(14, bandH - 8));
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(mx - 1, (bandH - logoH) / 2 - 1, logoW + 2, logoH + 2, 1.5, 1.5, "F");
      pdf.addImage(headerLogo.dataUri, headerLogo.format, mx, (bandH - logoH) / 2, logoW, logoH);
      mx += logoW + 5;
    } catch {
      /* ignore */
    }
  }

  const cw = Math.max(40, contentWidth(pageW) - (mx - mx0));
  pdf.setTextColor(255, 255, 255);
  setPdfFont(pdf, "bold");
  pdf.setFontSize(titleSize);
  let ty = 12;
  ty = drawPdfLines(pdf, splitPdfLines(pdf, title, cw), mx, ty, titleSize);
  if (subLines.length) {
    ty += 2;
    setPdfFont(pdf, "normal");
    pdf.setFontSize(subSize);
    pdf.setTextColor(186, 210, 235);
    drawPdfLines(pdf, splitPdfLines(pdf, subtitle!, cw), mx, ty, subSize);
  }

  return bandH + 6;
}

export function pdfFooterBaseline(pageH: number): number {
  return pageH - PDF_PAGE.footerH + PDF_PAGE.footerH * 0.62;
}

export function pdfFooterLogoY(pageH: number, logoH: number): number {
  return pageH - PDF_PAGE.footerH + (PDF_PAGE.footerH - logoH) / 2;
}

export { PDF_FONT };
