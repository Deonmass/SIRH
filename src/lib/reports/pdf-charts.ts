import type { jsPDF } from "jspdf";
import { setPdfFont } from "./pdf-fonts";
import { fitCellText, pdfLineHeightMm, splitPdfLines, truncateLabel } from "./pdf-layout";
import { defaultBrandPalette, type BrandPalette } from "./report-brand-palette";

/** Couleurs société injectées avant génération PDF */
let chartBrand: BrandPalette = defaultBrandPalette();

export function applyPdfChartBranding(palette: BrandPalette): void {
  chartBrand = palette;
  PIE_RGB[0] = palette.secondary;
  PIE_RGB[1] = palette.primary;
  PIE_RGB[2] = palette.secondaryDeep;
}

/** Palette alignée sur `DashboardView` (Recharts) */
export const DASHBOARD_COLORS = {
  blue: [59, 130, 246] as [number, number, number],
  violet: [139, 92, 246] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  cyan: [6, 182, 212] as [number, number, number],
  pink: [236, 72, 153] as [number, number, number],
  lime: [132, 204, 22] as [number, number, number],
  indigo: [99, 102, 241] as [number, number, number],
  sky: [14, 165, 233] as [number, number, number],
};

export const PIE_RGB: [number, number, number][] = [
  DASHBOARD_COLORS.blue,
  DASHBOARD_COLORS.violet,
  DASHBOARD_COLORS.emerald,
  DASHBOARD_COLORS.amber,
  DASHBOARD_COLORS.red,
  DASHBOARD_COLORS.cyan,
  DASHBOARD_COLORS.pink,
  DASHBOARD_COLORS.lime,
];

export type ChartBounds = { x: number; y: number; w: number; h: number };

export type LineSeries = {
  name: string;
  values: number[];
  color: [number, number, number];
};

export type BarSeries = {
  name: string;
  values: number[];
  color: [number, number, number];
};

function drawGrid(pdf: jsPDF, plot: ChartBounds, rows = 4) {
  pdf.setDrawColor(...chartBrand.border);
  pdf.setLineWidth(0.15);
  for (let i = 0; i <= rows; i++) {
    const gy = plot.y + (plot.h * i) / rows;
    pdf.line(plot.x, gy, plot.x + plot.w, gy);
  }
  pdf.setLineDashPattern([1.5, 1.5], 0);
  pdf.line(plot.x, plot.y, plot.x, plot.y + plot.h);
  pdf.line(plot.x, plot.y + plot.h, plot.x + plot.w, plot.y + plot.h);
  pdf.setLineDashPattern([], 0);
}

/** Carte graphique style dashboard (fond clair, titre navy) */
export function drawChartCard(
  pdf: jsPDF,
  bounds: ChartBounds,
  title: string,
  subtitle: string,
  render: (pdf: jsPDF, plot: ChartBounds) => void
) {
  pdf.setFillColor(...chartBrand.white);
  pdf.setDrawColor(...chartBrand.border);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(bounds.x, bounds.y, bounds.w, bounds.h, 2, 2, "FD");
  pdf.setFillColor(...chartBrand.primary);
  pdf.rect(bounds.x, bounds.y, bounds.w, 0.8, "F");

  setPdfFont(pdf, "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...chartBrand.primary);
  const titleLines = splitPdfLines(pdf, title, bounds.w - 8).slice(0, 2);
  const titleLh = pdfLineHeightMm(8, 1.2);
  titleLines.forEach((line, i) => pdf.text(line, bounds.x + 4, bounds.y + 6 + i * titleLh));

  setPdfFont(pdf, "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...chartBrand.muted);
  const subLines = splitPdfLines(pdf, subtitle, bounds.w - 8).slice(0, 2);
  const subLh = pdfLineHeightMm(6.5, 1.2);
  const subStart = bounds.y + 6 + titleLines.length * titleLh + 1;
  subLines.forEach((line, i) => pdf.text(line, bounds.x + 4, subStart + i * subLh));

  const headerH = 6 + titleLines.length * titleLh + (subLines.length ? 1 + subLines.length * subLh : 0) + 4;
  const plotTop = bounds.y + headerH;
  const plotH = Math.max(18, bounds.y + bounds.h - plotTop - 8);
  const plot: ChartBounds = {
    x: bounds.x + 5,
    y: plotTop,
    w: bounds.w - 10,
    h: plotH,
  };
  render(pdf, plot);
}

export function drawLineChart(
  pdf: jsPDF,
  plot: ChartBounds,
  labels: string[],
  series: LineSeries[]
) {
  if (!labels.length || !series.length) {
    setPdfFont(pdf, "italic");
    pdf.setFontSize(7);
    pdf.setTextColor(...chartBrand.muted);
    pdf.text("Aucune donnée", plot.x + plot.w / 2, plot.y + plot.h / 2, { align: "center" });
    return;
  }

  drawGrid(pdf, plot);
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const n = labels.length;
  const stepX = n > 1 ? plot.w / (n - 1) : plot.w;

  series.forEach((s) => {
    pdf.setDrawColor(...s.color);
    pdf.setLineWidth(0.7);
    for (let i = 0; i < n; i++) {
      const val = s.values[i] ?? 0;
      const px = plot.x + (n > 1 ? i * stepX : plot.w / 2);
      const py = plot.y + plot.h - (val / max) * plot.h;
      if (i > 0) {
        const pv = s.values[i - 1] ?? 0;
        const ppx = plot.x + (i - 1) * stepX;
        const ppy = plot.y + plot.h - (pv / max) * plot.h;
        pdf.line(ppx, ppy, px, py);
      }
      pdf.setFillColor(...s.color);
      pdf.circle(px, py, 0.8, "F");
    }
  });

  setPdfFont(pdf, "normal");
  pdf.setFontSize(5.5);
  pdf.setTextColor(...chartBrand.muted);
  labels.forEach((lab, i) => {
    const px = plot.x + (n > 1 ? i * stepX : plot.w / 2);
    pdf.text(truncateLabel(lab, 6), px, plot.y + plot.h + 4, { align: "center" });
  });

  let lx = plot.x;
  const legendMaxX = plot.x + plot.w - 4;
  series.forEach((s) => {
    if (lx + 28 > legendMaxX) return;
    pdf.setFillColor(...s.color);
    pdf.rect(lx, plot.y - 5, 3, 2, "F");
    pdf.setFontSize(5.5);
    pdf.setTextColor(...chartBrand.slate);
    pdf.text(truncateLabel(s.name, 12), lx + 4, plot.y - 3.5);
    lx += 28;
  });
}

export function drawGroupedBarChart(
  pdf: jsPDF,
  plot: ChartBounds,
  labels: string[],
  series: BarSeries[]
) {
  if (!labels.length) return;
  drawGrid(pdf, plot);
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const n = labels.length;
  const groupW = plot.w / n;
  const barCount = series.length;
  const barW = Math.min(4, (groupW - 3) / barCount);

  labels.forEach((lab, i) => {
    const gx = plot.x + i * groupW + groupW / 2;
    series.forEach((s, si) => {
      const val = s.values[i] ?? 0;
      const bh = (val / max) * plot.h;
      const bx = gx - (barCount * barW) / 2 + si * (barW + 0.8);
      pdf.setFillColor(...s.color);
      pdf.roundedRect(bx, plot.y + plot.h - bh, barW, bh, 0.5, 0.5, "F");
    });
    setPdfFont(pdf, "normal");
    pdf.setFontSize(5.5);
    pdf.setTextColor(...chartBrand.muted);
    pdf.text(truncateLabel(lab, 8), gx, plot.y + plot.h + 4, { align: "center" });
  });

  let lx = plot.x;
  series.forEach((s) => {
    pdf.setFillColor(...s.color);
    pdf.rect(lx, plot.y - 5, 3, 2, "F");
    pdf.setFontSize(5.5);
    pdf.text(truncateLabel(s.name, 10), lx + 4, plot.y - 3.5);
    lx += 24;
  });
}

export function drawStackedBarChart(
  pdf: jsPDF,
  plot: ChartBounds,
  labels: string[],
  series: BarSeries[]
) {
  if (!labels.length) return;
  drawGrid(pdf, plot);
  const totals = labels.map((_, i) => series.reduce((s, ser) => s + (ser.values[i] ?? 0), 0));
  const max = Math.max(...totals, 1);
  const barW = Math.min(12, (plot.w - 8) / labels.length - 3);

  labels.forEach((lab, i) => {
    const bx = plot.x + 4 + i * (barW + 3);
    let stackY = plot.y + plot.h;
    series.forEach((s) => {
      const val = s.values[i] ?? 0;
      const bh = (val / max) * plot.h;
      stackY -= bh;
      if (bh > 0) {
        pdf.setFillColor(...s.color);
        pdf.rect(bx, stackY, barW, bh, "F");
      }
    });
    setPdfFont(pdf, "normal");
    pdf.setFontSize(5.5);
    pdf.setTextColor(...chartBrand.muted);
    pdf.text(truncateLabel(lab, 8), bx + barW / 2, plot.y + plot.h + 4, { align: "center" });
  });
}

export function drawVerticalBarChart(
  pdf: jsPDF,
  plot: ChartBounds,
  labels: string[],
  values: number[],
  color: [number, number, number] = DASHBOARD_COLORS.blue
) {
  drawGroupedBarChart(pdf, plot, labels, [{ name: "", values, color }]);
}

export function drawHorizontalBarChart(
  pdf: jsPDF,
  plot: ChartBounds,
  labels: string[],
  values: number[],
  color: [number, number, number] = DASHBOARD_COLORS.blue
) {
  if (!labels.length) return;
  const max = Math.max(...values, 1);
  const rowH = Math.min(8, plot.h / labels.length);
  const labelW = Math.min(32, plot.w * 0.38);

  labels.forEach((lab, i) => {
    const val = values[i] ?? 0;
    const y = plot.y + i * rowH;
    setPdfFont(pdf, "normal");
    pdf.setFontSize(5.5);
    pdf.setTextColor(...chartBrand.slate);
    pdf.text(fitCellText(pdf, lab, labelW - 2, 5.5), plot.x, y + rowH * 0.65);
    const barW = ((plot.w - labelW - 8) * val) / max;
    pdf.setFillColor(...color);
    pdf.roundedRect(plot.x + labelW, y + 1, Math.max(barW, 0.5), rowH - 2, 0.5, 0.5, "F");
    setPdfFont(pdf, "bold");
    pdf.setFontSize(5.5);
    pdf.setTextColor(...chartBrand.primary);
    pdf.text(String(val), plot.x + labelW + barW + 1.5, y + rowH * 0.65);
  });
}

export function drawPieChart(
  pdf: jsPDF,
  plot: ChartBounds,
  labels: string[],
  values: number[],
  donut = true
) {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    setPdfFont(pdf, "italic");
    pdf.setFontSize(7);
    pdf.setTextColor(...chartBrand.muted);
    pdf.text("Aucune donnée", plot.x + plot.w / 2, plot.y + plot.h / 2, { align: "center" });
    return;
  }

  const cx = plot.x + plot.w * 0.38;
  const cy = plot.y + plot.h * 0.52;
  const r = Math.min(plot.w, plot.h) * 0.32;
  let start = -Math.PI / 2;

  values.forEach((val, i) => {
    if (val <= 0) return;
    const angle = (val / total) * Math.PI * 2;
    const end = start + angle;
    const steps = Math.max(6, Math.ceil(angle * 12));
    pdf.setFillColor(...PIE_RGB[i % PIE_RGB.length]);
    const path: [number, number][] = [[cx, cy]];
    for (let s = 0; s <= steps; s++) {
      const a = start + (angle * s) / steps;
      path.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    for (let p = 1; p < path.length - 1; p++) {
      pdf.triangle(path[0][0], path[0][1], path[p][0], path[p][1], path[p + 1][0], path[p + 1][1], "F");
    }
    start = end;
  });

  if (donut) {
    pdf.setFillColor(...chartBrand.white);
    pdf.circle(cx, cy, r * 0.48, "F");
    setPdfFont(pdf, "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...chartBrand.primary);
    pdf.text(String(total), cx, cy + 1, { align: "center" });
  }

  let ly = plot.y + 4;
  const lx = plot.x + plot.w * 0.62;
  labels.forEach((lab, i) => {
    if ((values[i] ?? 0) <= 0) return;
    pdf.setFillColor(...PIE_RGB[i % PIE_RGB.length]);
    pdf.rect(lx, ly - 2, 2.5, 2.5, "F");
    setPdfFont(pdf, "normal");
    pdf.setFontSize(5.5);
    pdf.setTextColor(...chartBrand.slate);
    const pct = Math.round(((values[i] ?? 0) / total) * 100);
    pdf.text(`${truncateLabel(lab, 16)} (${pct}%)`, lx + 4, ly);
    ly += 5;
  });
}
