import { jsPDF } from "jspdf";
import type { PdfLogoImage, ReportBranding } from "./pdf-branding";
import { fitLogoBox } from "./pdf-logo-load";
import { registerPdfFonts, setPdfFont } from "./pdf-fonts";
import {
  contentWidth,
  drawPdfLines,
  drawReportTopBand,
  drawWrappedText,
  fitCellText,
  normalizePdfText,
  PDF_PAGE,
  pdfBlockHeightMm,
  pdfFooterBaseline,
  pdfFooterLogoY,
  pdfLineHeightMm,
  splitPdfLines,
} from "./pdf-layout";
import {
  drawOverviewCharts,
  getSectionCharts,
  renderChartBatch,
  chartBatchEndY,
} from "./pdf-section-charts";
import { applyPdfChartBranding } from "./pdf-charts";
import {
  narrativeForSection,
  REPORT_SECTION_LABELS,
  sectionsForReport,
  type ReportSectionId,
} from "./report-narratives";
import { buildBrandPalette, defaultBrandPalette, type BrandPalette } from "./report-brand-palette";
import type { RhReportData } from "./types";

type BrandTheme = BrandPalette & {
  navy: BrandPalette["primary"];
  navyDark: BrandPalette["primaryDark"];
  accent: BrandPalette["secondary"];
  accentDeep: BrandPalette["secondaryDeep"];
};

let pageCounter = 0;
let brand: BrandTheme = {
  ...defaultBrandPalette(),
  navy: defaultBrandPalette().primary,
  navyDark: defaultBrandPalette().primaryDark,
  accent: defaultBrandPalette().secondary,
  accentDeep: defaultBrandPalette().secondaryDeep,
};
let headerLogo: PdfLogoImage | null = null;

function drawPdfLogo(
  pdf: jsPDF,
  logo: PdfLogoImage,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  backdrop = false
): { w: number; h: number } {
  const { w, h } = fitLogoBox(logo, maxW, maxH);
  if (backdrop) {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x - 1, y - 1, w + 2, h + 2, 1.5, 1.5, "F");
  }
  pdf.addImage(logo.dataUri, logo.format, x, y, w, h);
  return { w, h };
}

function initBrand(branding: ReportBranding) {
  const palette = buildBrandPalette(branding);
  brand = {
    ...palette,
    navy: palette.primary,
    navyDark: palette.primaryDark,
    accent: palette.secondary,
    accentDeep: palette.secondaryDeep,
  };
  headerLogo = branding.logo;
  applyPdfChartBranding(palette);
}

function resetPageCounter() {
  pageCounter = 0;
}

function paintWhitePage(pdf: jsPDF, pageW: number, pageH: number) {
  pdf.setFillColor(...brand.white);
  pdf.rect(0, 0, pageW, pageH, "F");
}

function drawNavyFooter(pdf: jsPDF, data: RhReportData, pageW: number, pageH: number, section?: string) {
  const footerTop = pageH - PDF_PAGE.footerH;
  pdf.setFillColor(...brand.navyDark);
  pdf.rect(0, footerTop, pageW, PDF_PAGE.footerH, "F");
  setPdfFont(pdf, "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(200, 210, 225);
  const mx = PDF_PAGE.marginX;
  const mr = pageW - PDF_PAGE.marginRight;
  const textY = pdfFooterBaseline(pageH);
  let footerX = mx;
  if (headerLogo) {
    try {
      const logoMaxH = PDF_PAGE.footerH - 4;
      const { w: logoW, h: logoH } = fitLogoBox(headerLogo, 14, logoMaxH);
      drawPdfLogo(pdf, headerLogo, mx, pdfFooterLogoY(pageH, logoH), 14, logoMaxH, true);
      footerX = mx + logoW + 3;
    } catch {
      /* ignore */
    }
  }
  const centerX = pageW / 2;
  const leftMaxW = Math.max(20, centerX - footerX - 6);
  pdf.text(
    fitCellText(pdf, `${data.meta.companyName} · ${data.meta.periodLabel}`, leftMaxW, 7),
    footerX,
    textY
  );
  if (section) {
    pdf.text(fitCellText(pdf, section, 62, 7), centerX, textY, { align: "center" });
  }
  pdf.text(`Page ${pageCounter}`, mr, textY, { align: "right" });
}

function newPage(pdf: jsPDF, data: RhReportData, pageW: number, pageH: number, section?: string) {
  if (pageCounter > 0) pdf.addPage();
  pageCounter++;
  paintWhitePage(pdf, pageW, pageH);
  drawNavyFooter(pdf, data, pageW, pageH, section);
}

function drawTopBand(pdf: jsPDF, pageW: number, title: string, subtitle?: string): number {
  return drawReportTopBand(pdf, pageW, brand, title, subtitle, headerLogo);
}

function drawHeadline(pdf: jsPDF, text: string, x: number, y: number, maxW: number): number {
  setPdfFont(pdf, "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(...brand.navy);
  const lines = splitPdfLines(pdf, text, maxW);
  const lineY = drawPdfLines(pdf, lines, x, y, 15);
  pdf.setDrawColor(...brand.accent);
  pdf.setLineWidth(0.8);
  pdf.line(x, lineY + 1, x + Math.min(80, maxW * 0.4), lineY + 1);
  return lineY + 8;
}

function drawInsightBox(pdf: jsPDF, items: string[], x: number, y: number, w: number): number {
  const padding = 4;
  const maxItemW = w - padding * 2;
  setPdfFont(pdf, "normal");
  pdf.setFontSize(8);
  const itemLines = items.flatMap((item) => splitPdfLines(pdf, `• ${item}`, maxItemW));
  const lineH = pdfLineHeightMm(8);
  const contentH = itemLines.length * lineH + padding * 2 + 10;

  pdf.setFillColor(...brand.ice);
  pdf.setDrawColor(...brand.border);
  pdf.roundedRect(x, y, w, contentH, 2, 2, "FD");
  setPdfFont(pdf, "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...brand.accentDeep);
  pdf.text("Points clés", x + padding, y + 6);

  setPdfFont(pdf, "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...brand.slate);
  let cy = y + 13;
  itemLines.forEach((line) => {
    pdf.text(line, x + padding, cy);
    cy += lineH;
  });
  return y + contentH + 6;
}

function drawChartCaption(pdf: jsPDF, caption: string, x: number, y: number, w: number): number {
  setPdfFont(pdf, "italic");
  pdf.setFontSize(8);
  const lines = splitPdfLines(pdf, caption, w - 8);
  const lineH = pdfLineHeightMm(8);
  const h = 6 + lines.length * lineH + 4;
  pdf.setFillColor(...brand.navy);
  pdf.roundedRect(x, y, w, h, 1, 1, "F");
  pdf.setTextColor(220, 235, 250);
  drawPdfLines(pdf, lines, x + 4, y + 6, 8);
  return y + h + 5;
}

function drawKpiRow(pdf: jsPDF, data: RhReportData, y: number, pageW: number): number {
  const cw = contentWidth(pageW);
  const mx = PDF_PAGE.marginX;
  const cardW = (cw - 10) / 3;
  const cardH = 28;
  let x = mx;
  let cy = y;
  let col = 0;
  data.kpis.forEach((kpi) => {
    pdf.setFillColor(...brand.ice);
    pdf.setDrawColor(...brand.accent);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, cy, cardW, cardH, 2, 2, "FD");
    pdf.setFillColor(...brand.navy);
    pdf.rect(x, cy, cardW, 3, "F");
    setPdfFont(pdf, "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...brand.muted);
    pdf.text(fitCellText(pdf, kpi.label, cardW - 8, 7), x + 4, cy + 11);
    setPdfFont(pdf, "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...brand.navy);
    pdf.text(fitCellText(pdf, String(kpi.value), cardW - 8, 12), x + 4, cy + 22);
    col++;
    if (col >= 3) {
      col = 0;
      x = mx;
      cy += cardH + 5;
    } else {
      x += cardW + 5;
    }
  });
  return col === 0 ? cy : cy + cardH + 5;
}

function measureRhCoverHeaderHeight(
  pdf: jsPDF,
  data: RhReportData,
  cw: number,
  logo: PdfLogoImage | null
): { headerH: number; textStartY: number } {
  let textStartY = 48;
  if (logo) {
    try {
      const { h: logoH } = fitLogoBox(logo, 52, 32);
      textStartY = 24 + logoH + 14;
    } catch {
      textStartY = 48;
    }
  }

  let y = textStartY;
  y += pdfBlockHeightMm(splitPdfLines(pdf, data.meta.companyName, cw).length, 20) + 4;
  y += pdfBlockHeightMm(splitPdfLines(pdf, data.meta.title, cw).length, 15) + 4;
  y += pdfLineHeightMm(11);
  y += pdfBlockHeightMm(splitPdfLines(pdf, data.meta.subtitle, cw).length, 10) + 4;
  const metaLine = normalizePdfText(
    `Généré le ${new Date(data.meta.generatedAt).toLocaleString("fr-FR")} · SIRH RDC`
  );
  y += pdfBlockHeightMm(splitPdfLines(pdf, metaLine, cw).length, 8) + 12;
  return { headerH: y, textStartY };
}

function drawCoverPage(pdf: jsPDF, data: RhReportData, pageW: number, pageH: number) {
  const mx = PDF_PAGE.marginX;
  const cw = contentWidth(pageW);
  const logo = data.meta.branding.logo;
  newPage(pdf, data, pageW, pageH, "Couverture");

  const { headerH, textStartY } = measureRhCoverHeaderHeight(pdf, data, cw, logo);

  pdf.setFillColor(...brand.navy);
  pdf.rect(0, 0, pageW, headerH, "F");
  pdf.setFillColor(...brand.accent);
  pdf.rect(0, headerH - 4, pageW, 4, "F");

  if (logo) {
    try {
      drawPdfLogo(pdf, logo, mx, 24, 52, 32, true);
    } catch {
      /* logo illisible — texte seul */
    }
  }

  pdf.setTextColor(255, 255, 255);
  setPdfFont(pdf, "bold");
  pdf.setFontSize(20);
  let ty = drawPdfLines(pdf, splitPdfLines(pdf, data.meta.companyName, cw), mx, textStartY, 20);

  pdf.setFontSize(15);
  pdf.setTextColor(...brand.accent);
  ty += 4;
  ty = drawPdfLines(pdf, splitPdfLines(pdf, data.meta.title, cw), mx, ty, 15);

  ty += 4;
  setPdfFont(pdf, "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(200, 220, 240);
  ty = drawPdfLines(pdf, [normalizePdfText(data.meta.periodLabel)], mx, ty, 11);

  ty += 2;
  ty = drawWrappedText(pdf, data.meta.subtitle, mx, ty, cw, {
    fontSize: 10,
    color: [200, 220, 240],
    gap: 4,
  });

  ty += 2;
  setPdfFont(pdf, "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(180, 200, 220);
  const metaLine = normalizePdfText(
    `Généré le ${new Date(data.meta.generatedAt).toLocaleString("fr-FR")} · SIRH RDC`
  );
  drawPdfLines(pdf, splitPdfLines(pdf, metaLine, cw), mx, ty, 8);

  const narrative = narrativeForSection(data, "synthese");
  let y = headerH + 16;
  if (y < PDF_PAGE.contentBottom - 40) {
    y = drawHeadline(pdf, narrative.headline, mx, y, cw);
    for (const p of narrative.paragraphs) {
      if (y >= PDF_PAGE.contentBottom - 12) break;
      y = drawWrappedText(pdf, p, mx, y, cw, { fontSize: 9.5 });
      y += 1;
    }
  }
}

function drawSyntheseKpiPage(pdf: jsPDF, data: RhReportData, pageW: number, pageH: number) {
  const section = REPORT_SECTION_LABELS.synthese;
  const mx = PDF_PAGE.marginX;
  const cw = contentWidth(pageW);
  newPage(pdf, data, pageW, pageH, section);
  const contentStart = drawTopBand(pdf, pageW, section, "Indicateurs clés de pilotage");
  const narrative = narrativeForSection(data, "synthese");
  let y = contentStart;
  y = drawChartCaption(pdf, narrative.chartCaption, mx, y, cw);
  y = drawKpiRow(pdf, data, y, pageW);
  if (y < PDF_PAGE.contentBottom - 50) {
    y = drawInsightBox(pdf, narrative.insights, mx, y + 2, cw);
  }
  if (y < PDF_PAGE.contentBottom - 20) {
    drawWrappedText(
      pdf,
      "Analyse : ces indicateurs doivent être lus conjointement — effectif et turnover pour la capacité, paie pour le budget, conformité pour le risque social.",
      mx,
      y + 4,
      cw,
      { fontSize: 8, color: brand.muted, style: "italic" }
    );
  }
}

function drawSyntheseChartsPage(pdf: jsPDF, data: RhReportData, pageW: number, pageH: number) {
  const section = REPORT_SECTION_LABELS.synthese;
  newPage(pdf, data, pageW, pageH, `${section} — graphiques`);
  const contentStart = drawTopBand(
    pdf,
    pageW,
    `${section} — tableaux de bord`,
    "Graphiques identiques à l'onglet Synthèse du dashboard"
  );
  drawOverviewCharts(pdf, data, pageW, contentStart);
}

function drawSectionIntroPage(
  pdf: jsPDF,
  data: RhReportData,
  sectionId: ReportSectionId,
  pageW: number,
  pageH: number
) {
  const label = REPORT_SECTION_LABELS[sectionId];
  const mx = PDF_PAGE.marginX;
  const cw = contentWidth(pageW);
  newPage(pdf, data, pageW, pageH, label);
  const contentStart = drawTopBand(pdf, pageW, label, `Section · ${data.meta.periodLabel}`);
  const narrative = narrativeForSection(data, sectionId);
  let y = contentStart;
  y = drawHeadline(pdf, narrative.headline, mx, y, cw);
  for (const p of narrative.paragraphs) {
    y = drawWrappedText(pdf, p, mx, y, cw, { fontSize: 9.5 });
    y += 2;
    if (y > PDF_PAGE.contentBottom - 45) break;
  }
  if (y < PDF_PAGE.contentBottom - 55) {
    drawInsightBox(pdf, narrative.insights, mx, y + 4, cw);
  }
}

function drawAllSectionChartPages(
  pdf: jsPDF,
  data: RhReportData,
  sectionId: ReportSectionId,
  pageW: number,
  pageH: number
) {
  const label = REPORT_SECTION_LABELS[sectionId];
  const mx = PDF_PAGE.marginX;
  const cw = contentWidth(pageW);
  const charts = getSectionCharts(sectionId, data);
  const narrative = narrativeForSection(data, sectionId);
  let idx = 0;
  let part = 0;

  while (idx < charts.length) {
    const footerLabel =
      part === 0 ? `${label} — graphiques` : `${label} — graphiques (${part + 1})`;
    newPage(pdf, data, pageW, pageH, footerLabel);

    let chartStartY: number = PDF_PAGE.contentTop;
    const batchStart = idx;

    if (part === 0) {
      chartStartY = drawTopBand(
        pdf,
        pageW,
        `${label} — analyse visuelle`,
        "Graphiques identiques au tableau de bord SIRH"
      );
      let y = chartStartY;
      y = drawChartCaption(pdf, narrative.chartCaption, mx, y, cw);
      chartStartY = y;
      idx = renderChartBatch(pdf, pageW, chartStartY, charts, idx);
    } else {
      chartStartY = drawTopBand(
        pdf,
        pageW,
        `${label} — graphiques (suite)`,
        `Suite ${part + 1}`
      );
      idx = renderChartBatch(pdf, pageW, chartStartY, charts, idx);
    }

    if (idx >= charts.length) {
      const comment = narrative.paragraphs[narrative.paragraphs.length - 1] ?? "";
      if (comment) {
        const rendered = idx - batchStart;
        const batchEnd = chartBatchEndY(chartStartY, rendered);
        const commentY = Math.min(batchEnd + 4, PDF_PAGE.contentBottom - 14);
        if (commentY + 6 < PDF_PAGE.contentBottom) {
          drawWrappedText(
            pdf,
            `Commentaire : ${comment}`,
            mx,
            commentY,
            cw,
            { fontSize: 7.5, color: brand.muted, style: "italic", gap: 0 }
          );
        }
      }
    }

    part++;
  }
}

export function buildRhReportPdf(data: RhReportData): Buffer {
  resetPageCounter();
  initBrand(data.meta.branding);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  registerPdfFonts(pdf);
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  drawCoverPage(pdf, data, pageW, pageH);
  drawSyntheseKpiPage(pdf, data, pageW, pageH);
  drawSyntheseChartsPage(pdf, data, pageW, pageH);

  const sections = sectionsForReport(data).filter((id) => id !== "synthese");
  for (const sectionId of sections) {
    drawSectionIntroPage(pdf, data, sectionId, pageW, pageH);
    drawAllSectionChartPages(pdf, data, sectionId, pageW, pageH);
  }

  return Buffer.from(pdf.output("arraybuffer"));
}
