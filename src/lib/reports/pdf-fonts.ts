import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { jsPDF } from "jspdf";

/** Nom logique dans le PDF (Carlito = substitut open-source métrique Calibri). */
export const PDF_FONT = "Calibri" as const;

export type PdfFontStyle = "normal" | "bold" | "italic" | "bolditalic";

const FONT_FILES: Record<PdfFontStyle, string> = {
  normal: "Carlito-Regular.ttf",
  bold: "Carlito-Bold.ttf",
  italic: "Carlito-Italic.ttf",
  bolditalic: "Carlito-BoldItalic.ttf",
};

const registeredDocs = new WeakSet<jsPDF>();

function fontDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "fonts");
}

/** Enregistre Calibri (Carlito) une fois par instance jsPDF. */
export function registerPdfFonts(pdf: jsPDF): void {
  if (registeredDocs.has(pdf)) {
    pdf.setFont(PDF_FONT, "normal");
    return;
  }

  for (const [style, file] of Object.entries(FONT_FILES) as [PdfFontStyle, string][]) {
    const base64 = readFileSync(join(fontDir(), file)).toString("base64");
    pdf.addFileToVFS(file, base64);
    pdf.addFont(file, PDF_FONT, style);
  }

  registeredDocs.add(pdf);
  pdf.setFont(PDF_FONT, "normal");
}

export function setPdfFont(pdf: jsPDF, style: PdfFontStyle = "normal"): void {
  pdf.setFont(PDF_FONT, style);
}

/** Mappe nos styles vers les variantes jsPDF. */
export function mapTextStyleToPdf(style?: "normal" | "bold" | "italic"): PdfFontStyle {
  if (style === "bold") return "bold";
  if (style === "italic") return "italic";
  return "normal";
}
