import { jsPDF } from "jspdf";
import { formatKm } from "@/lib/charroi-entretien";
import type { PdfLogoImage, ReportBranding } from "../pdf-branding";
import { fitLogoBox } from "../pdf-logo-load";
import { registerPdfFonts, setPdfFont } from "../pdf-fonts";
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
} from "../pdf-layout";
import { buildBrandPalette, defaultBrandPalette, type BrandPalette } from "../report-brand-palette";
import type { CharroiReportData, CountRow } from "./types";

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
}

function paintWhitePage(pdf: jsPDF, pageW: number, pageH: number) {
  pdf.setFillColor(...brand.white);
  pdf.rect(0, 0, pageW, pageH, "F");
}

function drawNavyFooter(
  pdf: jsPDF,
  data: CharroiReportData,
  pageW: number,
  pageH: number,
  section?: string
) {
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
      drawPdfLogo(
        pdf,
        headerLogo,
        mx,
        pdfFooterLogoY(pageH, logoH),
        14,
        logoMaxH,
        true
      );
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

function newPage(
  pdf: jsPDF,
  data: CharroiReportData,
  pageW: number,
  pageH: number,
  section?: string
) {
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

function measureCoverHeaderHeight(
  pdf: jsPDF,
  data: CharroiReportData,
  cw: number,
  logo: PdfLogoImage | null
): { headerH: number; textStartY: number } {
  let textStartY = 28;
  if (logo) {
    try {
      const { h: logoH } = fitLogoBox(logo, 56, 36);
      textStartY = 22 + logoH + 14;
    } catch {
      textStartY = 28;
    }
  }

  let y = textStartY;
  y += pdfBlockHeightMm(splitPdfLines(pdf, data.meta.companyName, cw).length, 22) + 4;
  y += pdfBlockHeightMm(1, 16) + 4;
  y += pdfBlockHeightMm(splitPdfLines(pdf, data.meta.title, cw).length, 14) + 4;
  y += pdfLineHeightMm(12);
  y += pdfBlockHeightMm(splitPdfLines(pdf, data.meta.subtitle, cw).length, 10) + 4;
  const metaLine = normalizePdfText(
    `Période : ${data.meta.dateFrom} → ${data.meta.dateTo} · Généré le ${new Date(data.meta.generatedAt).toLocaleString("fr-FR")}`
  );
  y += pdfBlockHeightMm(splitPdfLines(pdf, metaLine, cw).length, 8) + 12;
  return { headerH: y, textStartY };
}

function drawKpiCard(
  pdf: jsPDF,
  kpi: { label: string; value: string },
  x: number,
  y: number,
  cardW: number,
  cardH: number
) {
  pdf.setFillColor(...brand.ice);
  pdf.setDrawColor(...brand.border);
  pdf.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
  setPdfFont(pdf, "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...brand.accentDeep);
  pdf.text(fitCellText(pdf, kpi.value, cardW - 8, 14), x + 4, y + 12);
  setPdfFont(pdf, "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...brand.slate);
  pdf.text(fitCellText(pdf, kpi.label, cardW - 8, 8), x + 4, y + 21);
}

function drawCharroiKpiGrid(
  pdf: jsPDF,
  data: CharroiReportData,
  pageW: number,
  pageH: number,
  y: number,
  sectionLabel: string
): number {
  const mx = PDF_PAGE.marginX;
  const cw = contentWidth(pageW);
  const cardW = (cw - 8) / 2;
  const cardH = 26;
  const rowH = cardH + 6;
  const kpis = data.kpis.slice(0, 6);
  let i = 0;

  while (i < kpis.length) {
    const rowsNeeded = Math.ceil((kpis.length - i) / 2);
    const blockH = rowsNeeded * rowH - 6;
    if (y + blockH > PDF_PAGE.contentBottom) {
      newPage(pdf, data, pageW, pageH, sectionLabel);
      y = drawTopBand(
        pdf,
        pageW,
        i === 0 ? "Indicateurs clés" : "Indicateurs clés (suite)",
        data.meta.periodLabel
      );
    }

    const maxRows = Math.max(1, Math.floor((PDF_PAGE.contentBottom - y + 6) / rowH));
    const rowsThisPage = Math.min(maxRows, rowsNeeded);

    for (let r = 0; r < rowsThisPage; r++) {
      for (let c = 0; c < 2; c++) {
        if (i >= kpis.length) break;
        drawKpiCard(pdf, kpis[i], mx + c * (cardW + 8), y + r * rowH, cardW, cardH);
        i++;
      }
    }
    y += rowsThisPage * rowH;
  }
  return y + 4;
}

function drawCoverPage(pdf: jsPDF, data: CharroiReportData, pageW: number, pageH: number) {
  const mx = PDF_PAGE.marginX;
  const cw = contentWidth(pageW);
  const logo = data.meta.branding.logo;
  newPage(pdf, data, pageW, pageH, "Couverture");

  const { headerH, textStartY } = measureCoverHeaderHeight(pdf, data, cw, logo);

  pdf.setFillColor(...brand.navy);
  pdf.rect(0, 0, pageW, headerH, "F");
  pdf.setFillColor(...brand.accent);
  pdf.rect(0, headerH - 4, pageW, 4, "F");

  if (logo) {
    try {
      drawPdfLogo(pdf, logo, mx, 22, 56, 36, true);
    } catch {
      /* logo illisible */
    }
  }

  pdf.setTextColor(255, 255, 255);
  setPdfFont(pdf, "bold");
  pdf.setFontSize(22);
  let ty = drawPdfLines(pdf, splitPdfLines(pdf, data.meta.companyName, cw), mx, textStartY, 22);

  pdf.setFontSize(16);
  pdf.setTextColor(...brand.accent);
  ty += 4;
  ty = drawPdfLines(pdf, ["Charroi automobile"], mx, ty, 16);

  ty += 4;
  setPdfFont(pdf, "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  ty = drawPdfLines(pdf, splitPdfLines(pdf, data.meta.title, cw), mx, ty, 14);

  ty += 4;
  setPdfFont(pdf, "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(200, 220, 240);
  ty = drawPdfLines(pdf, [normalizePdfText(data.meta.periodLabel)], mx, ty, 12);

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
    `Période : ${data.meta.dateFrom} → ${data.meta.dateTo} · Généré le ${new Date(data.meta.generatedAt).toLocaleString("fr-FR")}`
  );
  drawPdfLines(pdf, splitPdfLines(pdf, metaLine, cw), mx, ty, 8);

  let y = headerH + 16;
  y = drawHeadline(pdf, "Synthèse exécutive", mx, y, cw);

  const bullets = [
    `${data.parc.total} véhicules au parc · ${data.parc.disponibles.length} disponibles`,
    `${data.courses.total} courses sur la période · ${formatKm(data.courses.kmParcours)} parcourus`,
    `${data.pannes.vehiculesEnPanne} véhicule(s) hors service · ${data.pannes.eventsPeriode} événement(s) panne/remise`,
    `${data.entretien.enRetard} entretien(s) en retard · ${data.entretien.historiquePeriode} réalisé(s) sur la période`,
  ];
  for (const b of bullets) {
    if (y >= PDF_PAGE.contentBottom - 14) break;
    y = drawWrappedText(pdf, `• ${b}`, mx, y, cw, { fontSize: 10 });
    y += 2;
  }

  if (y + 28 > PDF_PAGE.contentBottom) {
    newPage(pdf, data, pageW, pageH, "Synthèse");
    y = drawTopBand(pdf, pageW, "Indicateurs clés", data.meta.periodLabel);
  } else {
    y += 6;
    y = drawHeadline(pdf, "Indicateurs clés", mx, y, cw);
  }

  drawCharroiKpiGrid(pdf, data, pageW, pageH, y, "Synthèse");
}

function drawCountTable(
  pdf: jsPDF,
  data: CharroiReportData,
  pageW: number,
  pageH: number,
  sectionTitle: string,
  rows: CountRow[],
  startY: number
): number {
  const mx = PDF_PAGE.marginX;
  const cw = contentWidth(pageW);
  let y = startY;

  if (y > PDF_PAGE.contentBottom - 40) {
    newPage(pdf, data, pageW, pageH, sectionTitle);
    y = drawTopBand(pdf, pageW, sectionTitle, data.meta.periodLabel);
  }

  y = drawHeadline(pdf, sectionTitle, mx, y, cw);
  const colW = [cw * 0.65, cw * 0.35];
  pdf.setFillColor(...brand.accent);
  pdf.rect(mx, y, cw, 8, "F");
  setPdfFont(pdf, "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Libellé", mx + 2, y + 5.5);
  pdf.text("Nombre", mx + colW[0] + 2, y + 5.5);
  y += 10;

  rows.slice(0, 12).forEach((row, idx) => {
    if (y > PDF_PAGE.contentBottom - 8) {
      newPage(pdf, data, pageW, pageH, sectionTitle);
      y = drawTopBand(pdf, pageW, sectionTitle, data.meta.periodLabel);
    }
    if (idx % 2 === 0) {
      pdf.setFillColor(...brand.ice);
      pdf.rect(mx, y - 4, cw, 7, "F");
    }
    setPdfFont(pdf, "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...brand.slate);
    pdf.text(fitCellText(pdf, row.label, colW[0] - 4, 8), mx + 2, y);
    pdf.text(String(row.count), mx + colW[0] + 2, y);
    y += 8;
  });
  return y + 8;
}

function drawDataTable(
  pdf: jsPDF,
  data: CharroiReportData,
  pageW: number,
  pageH: number,
  sectionTitle: string,
  headers: string[],
  colWidths: number[],
  rows: string[][],
  startY: number
): number {
  const mx = PDF_PAGE.marginX;
  const cw = contentWidth(pageW);
  let y = startY;

  const ensureSpace = (need: number) => {
    if (y + need > PDF_PAGE.contentBottom) {
      newPage(pdf, data, pageW, pageH, sectionTitle);
      y = drawTopBand(pdf, pageW, sectionTitle, data.meta.periodLabel);
    }
  };

  ensureSpace(20);
  y = drawHeadline(pdf, sectionTitle, mx, y, cw);

  pdf.setFillColor(...brand.navy);
  pdf.rect(mx, y, cw, 8, "F");
  setPdfFont(pdf, "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255);
  let hx = mx + 2;
  headers.forEach((h, i) => {
    pdf.text(h, hx, y + 5.5);
    hx += colWidths[i] ?? cw / headers.length;
  });
  y += 10;

  rows.forEach((row, idx) => {
    ensureSpace(8);
    if (idx % 2 === 0) {
      pdf.setFillColor(...brand.ice);
      pdf.rect(mx, y - 4, cw, 7, "F");
    }
    setPdfFont(pdf, "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...brand.slate);
    let rx = mx + 2;
    row.forEach((cell, i) => {
      pdf.text(fitCellText(pdf, cell, (colWidths[i] ?? 20) - 2, 7), rx, y);
      rx += colWidths[i] ?? 20;
    });
    y += 8;
  });
  return y + 8;
}

function drawSectionPage(
  pdf: jsPDF,
  data: CharroiReportData,
  pageW: number,
  pageH: number,
  bandTitle: string,
  bandSubtitle: string
) {
  newPage(pdf, data, pageW, pageH, bandTitle);
  return drawTopBand(pdf, pageW, bandTitle, bandSubtitle);
}

export function buildCharroiReportPdf(data: CharroiReportData): Buffer {
  initBrand(data.meta.branding);
  pageCounter = 0;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  registerPdfFonts(pdf);
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  drawCoverPage(pdf, data, pageW, pageH);

  let y: number = drawSectionPage(
    pdf,
    data,
    pageW,
    pageH,
    "Parc automobile",
    `${data.parc.total} véhicules · ${data.parc.disponibles.length} disponibles`
  );

  y = drawCountTable(pdf, data, pageW, pageH, "Répartition par statut", data.parc.parStatut, y);
  y = drawCountTable(pdf, data, pageW, pageH, "Par marque", data.parc.parMarque, y);
  y = drawCountTable(pdf, data, pageW, pageH, "Par type", data.parc.parType, y);

  const cw = contentWidth(pageW);
  y = drawDataTable(
    pdf,
    data,
    pageW,
    pageH,
    "Véhicules disponibles",
    ["Immat.", "Marque", "Type", "Km actuel"],
    [cw * 0.22, cw * 0.28, cw * 0.28, cw * 0.22],
    data.parc.disponibles.map((v) => [
      v.immatriculation,
      v.marque,
      v.type,
      v.kmActuel != null ? formatKm(v.kmActuel) : "—",
    ]),
    y
  );

  y = drawSectionPage(
    pdf,
    data,
    pageW,
    pageH,
    "Courses & mobilité",
    `${data.courses.total} courses · ${formatKm(data.courses.kmParcours)} parcourus`
  );

  y = drawCountTable(pdf, data, pageW, pageH, "Par statut", data.courses.parStatut, y);
  y = drawCountTable(pdf, data, pageW, pageH, "Par type de course", data.courses.parType, y);
  y = drawCountTable(pdf, data, pageW, pageH, "Par chauffeur", data.courses.parChauffeur, y);

  y = drawDataTable(
    pdf,
    data,
    pageW,
    pageH,
    "Détail des courses (extrait)",
    ["Date", "Demandeur", "Chauffeur", "Type", "Statut", "Km"],
    [cw * 0.12, cw * 0.16, cw * 0.16, cw * 0.2, cw * 0.14, cw * 0.1],
    data.courses.liste.slice(0, 25).map((c) => [
      c.date,
      c.demandeur,
      c.chauffeur,
      c.type,
      c.statut,
      c.kmParcours != null ? formatKm(c.kmParcours) : "—",
    ]),
    y
  );

  y = drawSectionPage(
    pdf,
    data,
    pageW,
    pageH,
    "Pannes",
    `${data.pannes.vehiculesEnPanne} hors service · ${data.pannes.eventsPeriode} événements`
  );

  y = drawCountTable(pdf, data, pageW, pageH, "Pannes par véhicule", data.pannes.parVehicule, y);
  y = drawDataTable(
    pdf,
    data,
    pageW,
    pageH,
    "Historique pannes / remises",
    ["Date", "Véhicule", "Type", "Description"],
    [cw * 0.12, cw * 0.18, cw * 0.12, cw * 0.58],
    data.pannes.liste.slice(0, 20).map((p) => [
      p.date,
      p.immatriculation,
      p.enPanne ? "Panne" : "Remise",
      p.description,
    ]),
    y
  );

  y = drawSectionPage(
    pdf,
    data,
    pageW,
    pageH,
    "Entretien",
    `${data.entretien.enRetard} en retard · ${data.entretien.historiquePeriode} réalisés`
  );

  y = drawDataTable(
    pdf,
    data,
    pageW,
    pageH,
    "Alertes entretien",
    ["Véhicule", "Marque", "Alerte", "Km actuel", "Prochain km"],
    [cw * 0.16, cw * 0.18, cw * 0.28, cw * 0.18, cw * 0.2],
    data.entretien.alertes.slice(0, 15).map((e) => [
      e.immatriculation,
      e.marque,
      e.alerte,
      e.kmActuel != null ? formatKm(e.kmActuel) : "—",
      e.prochainKm != null ? formatKm(e.prochainKm) : "—",
    ]),
    y
  );

  drawDataTable(
    pdf,
    data,
    pageW,
    pageH,
    "Historique entretien (période)",
    ["Date", "Véhicule", "Types", "Km", "Prestataire"],
    [cw * 0.12, cw * 0.16, cw * 0.32, cw * 0.12, cw * 0.28],
    data.entretien.historique.slice(0, 20).map((h) => [
      h.date,
      h.immatriculation,
      h.types,
      h.km != null ? formatKm(h.km) : "—",
      h.prestataire,
    ]),
    y
  );

  return Buffer.from(pdf.output("arraybuffer"));
}
