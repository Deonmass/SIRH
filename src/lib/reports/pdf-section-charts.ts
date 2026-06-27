import type { jsPDF } from "jspdf";
import { chartsForReportSection, type PdfChartDef } from "./dashboard-charts";
import { drawChartCard } from "./pdf-charts";
import { grid2x2, PDF_PAGE } from "./pdf-layout";
import type { ReportSectionId } from "./report-narratives";
import type { RhReportData } from "./types";

const CHARTS_PER_PAGE = 4;

/** Dessine jusqu'à 4 graphiques en grille 2×2. Retourne l'index du prochain graphique. */
export function renderChartBatch(
  pdf: jsPDF,
  pageW: number,
  startY: number,
  charts: PdfChartDef[],
  fromIndex: number
): number {
  const { gap, cardW, cardH } = grid2x2(pageW);
  const x0 = PDF_PAGE.marginX;
  const rowHeight = cardH + gap;
  const batch = charts.slice(fromIndex, fromIndex + CHARTS_PER_PAGE);

  batch.forEach((chart, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bounds = {
      x: x0 + col * (cardW + gap),
      y: startY + row * rowHeight,
      w: cardW,
      h: cardH,
    };
    drawChartCard(pdf, bounds, chart.title, chart.subtitle, chart.render);
  });

  return fromIndex + batch.length;
}

export function chartBatchEndY(startY: number, batchSize: number): number {
  const { gap, cardH } = grid2x2(210);
  const rows = Math.ceil(batchSize / 2);
  return startY + rows * (cardH + gap) + 4;
}

export function drawOverviewCharts(pdf: jsPDF, data: RhReportData, pageW: number, startY: number) {
  const charts = chartsForReportSection("synthese", data);
  renderChartBatch(pdf, pageW, startY, charts, 0);
  return chartBatchEndY(startY, charts.length);
}

export function drawSectionCharts(
  pdf: jsPDF,
  data: RhReportData,
  sectionId: ReportSectionId,
  pageW: number,
  startY: number
): number {
  const charts = chartsForReportSection(sectionId, data);
  const rendered = renderChartBatch(pdf, pageW, startY, charts, 0);
  return chartBatchEndY(startY, rendered);
}

export function getSectionCharts(sectionId: ReportSectionId, data: RhReportData): PdfChartDef[] {
  return chartsForReportSection(sectionId, data);
}

export { CHARTS_PER_PAGE };
