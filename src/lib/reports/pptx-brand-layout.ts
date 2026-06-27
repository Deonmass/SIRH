import type PptxGenJS from "pptxgenjs";
import { fitLogoBox } from "./pdf-logo-load";
import type { PdfLogoImage } from "./pdf-branding";
import {
  buildBrandPalette,
  truncateSlideText,
  type BrandPalette,
} from "./report-brand-palette";
import type { ReportBranding } from "./pdf-branding";

export type PptxBrandContext = {
  palette: BrandPalette;
};

export function createPptxBrandContext(branding: ReportBranding): PptxBrandContext {
  return { palette: buildBrandPalette(branding) };
}

export function fitLogoInches(
  logo: PdfLogoImage,
  maxWIn: number,
  maxHIn: number
): { w: number; h: number } {
  const mm = fitLogoBox(logo, maxWIn * 25.4, maxHIn * 25.4);
  return { w: mm.w / 25.4, h: mm.h / 25.4 };
}

export function addPptxLogo(
  slide: PptxGenJS.Slide,
  logo: PdfLogoImage | null,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  withBackdrop = false
): { w: number; h: number } {
  if (!logo) return { w: 0, h: 0 };
  const { w, h } = fitLogoInches(logo, maxW, maxH);
  if (withBackdrop) {
    slide.addShape("roundRect", {
      x: x - 0.04,
      y: y - 0.04,
      w: w + 0.08,
      h: h + 0.08,
      fill: { color: "FFFFFF" },
      line: { color: "E2E8F0", width: 0.5 },
      rectRadius: 0.04,
    });
  }
  slide.addImage({ data: logo.dataUri, x, y, w, h });
  return { w, h };
}

const SLIDE_W = 13.33;
const MARGIN = 0.45;
const FOOTER_Y = 5.42;
const HEADER_H = 1.02;
const CONTENT_TOP = 1.2;
const CONTENT_WIDTH = SLIDE_W - MARGIN * 2;

export type PptxGridLayout = {
  cols: number;
  colW: number;
  gap: number;
  cellX: (col: number) => number;
  cellY: (row: number, rowH: number, startY?: number) => number;
};

/** Grille responsive — colonnes toujours dans la zone utile (MARGIN → SLIDE_W - MARGIN). */
export function computePptxGrid(cols: number, gap = 0.12): PptxGridLayout {
  const safeCols = Math.max(1, cols);
  const colW = (CONTENT_WIDTH - gap * (safeCols - 1)) / safeCols;
  return {
    cols: safeCols,
    colW,
    gap,
    cellX: (col) => MARGIN + col * (colW + gap),
    cellY: (row, rowH, startY = CONTENT_TOP) => startY + row * (rowH + gap),
  };
}

export function addPptxKpiGrid(
  slide: PptxGenJS.Slide,
  ctx: PptxBrandContext,
  items: { label: string; value: string }[],
  opts?: { cols?: number; maxItems?: number; rowH?: number; startY?: number; gap?: number }
): void {
  const cols = opts?.cols ?? 3;
  const rowH = opts?.rowH ?? 1.05;
  const startY = opts?.startY ?? CONTENT_TOP;
  const grid = computePptxGrid(cols, opts?.gap ?? 0.12);
  const list = items.slice(0, opts?.maxItems ?? items.length);

  list.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    addPptxKpiCard(slide, ctx, {
      x: grid.cellX(col),
      y: grid.cellY(row, rowH, startY),
      w: grid.colW,
      h: rowH,
      label: item.label,
      value: item.value,
    });
  });
}

export function addPptxBrandedHeader(
  slide: PptxGenJS.Slide,
  ctx: PptxBrandContext,
  title: string,
  subtitle?: string
): number {
  const p = ctx.palette;
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: HEADER_H,
    fill: { color: p.primaryHex },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 0.1,
    h: HEADER_H,
    fill: { color: p.secondaryHex },
  });

  let textX = MARGIN;
  const logo = addPptxLogo(slide, p.logo, MARGIN, 0.12, 0.95, 0.78, true);
  if (logo.w > 0) textX = MARGIN + logo.w + 0.18;

  const textW = CONTENT_WIDTH - (textX - MARGIN);
  slide.addText(truncateSlideText(title, 80), {
    x: textX,
    y: 0.14,
    w: textW,
    h: subtitle ? 0.42 : 0.55,
    fontSize: subtitle ? 18 : 20,
    bold: true,
    color: p.onPrimaryHex,
    fontFace: "Calibri",
    fit: "shrink",
    valign: "middle",
  });

  if (subtitle) {
    slide.addText(truncateSlideText(subtitle, 100), {
      x: textX,
      y: 0.58,
      w: textW,
      h: 0.32,
      fontSize: 10,
      color: p.onPrimaryMutedHex,
      fontFace: "Calibri",
      fit: "shrink",
      valign: "top",
    });
  }

  return CONTENT_TOP;
}

export function addPptxBrandedFooter(
  slide: PptxGenJS.Slide,
  ctx: PptxBrandContext,
  companyName: string,
  periodLabel: string,
  section?: string
): void {
  const p = ctx.palette;
  slide.addShape("rect", {
    x: 0,
    y: FOOTER_Y,
    w: "100%",
    h: 0.3,
    fill: { color: p.primaryDarkHex },
  });

  let leftX = MARGIN;
  if (p.logo) {
    const mini = addPptxLogo(slide, p.logo, MARGIN, FOOTER_Y + 0.04, 0.35, 0.22);
    leftX = MARGIN + mini.w + 0.08;
  }

  slide.addText(truncateSlideText(`${companyName} · ${periodLabel}`, 70), {
    x: leftX,
    y: FOOTER_Y + 0.06,
    w: 4.8,
    h: 0.18,
    fontSize: 7,
    color: p.onPrimaryMutedHex,
    fit: "shrink",
  });

  if (section) {
    slide.addText(truncateSlideText(section, 55), {
      x: 4.2,
      y: FOOTER_Y + 0.06,
      w: 4.8,
      h: 0.18,
      fontSize: 7,
      color: p.onPrimaryMutedHex,
      align: "center",
      fit: "shrink",
    });
  }
}

export function addPptxCoverSlide(
  pptx: PptxGenJS,
  ctx: PptxBrandContext,
  input: {
    companyName: string;
    moduleLabel?: string;
    title: string;
    periodLabel: string;
    subtitle?: string;
    dateRange?: string;
    footerSection?: string;
    belowHeadline?: string;
    belowParagraphs?: string[];
  }
): PptxGenJS.Slide {
  const p = ctx.palette;
  const slide = pptx.addSlide();
  slide.background = { color: p.whiteHex };

  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: 3.15,
    fill: { color: p.primaryHex },
  });
  slide.addShape("rect", {
    x: 0,
    y: 3.1,
    w: "100%",
    h: 0.06,
    fill: { color: p.secondaryHex },
  });

  const logo = addPptxLogo(slide, p.logo, MARGIN, 0.35, 2.2, 1.15, true);
  let ty = logo.h > 0 ? 0.35 + logo.h + 0.2 : 0.5;
  const tx = MARGIN;
  const tw = CONTENT_WIDTH;

  slide.addText(truncateSlideText(input.companyName, 60), {
    x: tx,
    y: ty,
    w: tw,
    h: 0.55,
    fontSize: 28,
    bold: true,
    color: p.onPrimaryHex,
    fit: "shrink",
  });
  ty += 0.62;

  if (input.moduleLabel) {
    slide.addText(truncateSlideText(input.moduleLabel, 40), {
      x: tx,
      y: ty,
      w: tw,
      h: 0.35,
      fontSize: 14,
      color: p.secondaryHex,
      fit: "shrink",
    });
    ty += 0.42;
  }

  slide.addText(truncateSlideText(input.title, 80), {
    x: tx,
    y: ty,
    w: tw,
    h: 0.45,
    fontSize: 16,
    color: p.onPrimaryMutedHex,
    fit: "shrink",
  });
  ty += 0.5;

  slide.addText(truncateSlideText(input.periodLabel, 50), {
    x: tx,
    y: ty,
    w: tw,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: p.onPrimaryHex,
    fit: "shrink",
  });

  if (input.dateRange) {
    ty += 0.34;
    slide.addText(truncateSlideText(input.dateRange, 40), {
      x: tx,
      y: ty,
      w: tw,
      h: 0.25,
      fontSize: 10,
      color: p.onPrimaryMutedHex,
      fit: "shrink",
    });
  }

  if (input.subtitle) {
    slide.addText(truncateSlideText(input.subtitle, 160), {
      x: MARGIN,
      y: 3.45,
      w: tw,
      h: 0.5,
      fontSize: 10,
      color: p.mutedHex,
      fit: "shrink",
      valign: "top",
    });
  }

  let by = 4.05;
  if (input.belowHeadline) {
    slide.addText(truncateSlideText(input.belowHeadline, 80), {
      x: MARGIN,
      y: by,
      w: tw,
      h: 0.38,
      fontSize: 15,
      bold: true,
      color: p.primaryHex,
      fit: "shrink",
    });
    by += 0.45;
  }
  if (input.belowParagraphs?.length) {
    slide.addText(
      input.belowParagraphs.slice(0, 2).map((para, i) => ({
        text: truncateSlideText(para, 220),
        options: { breakLine: true, paraSpaceAfter: i < input.belowParagraphs!.length - 1 ? 8 : 0 },
      })),
      {
        x: MARGIN,
        y: by,
        w: tw,
        h: 0.9,
        fontSize: 10,
        color: p.slateHex,
        fit: "shrink",
        valign: "top",
      }
    );
  }

  addPptxBrandedFooter(slide, ctx, input.companyName, input.periodLabel, input.footerSection ?? "Couverture");
  return slide;
}

export function addPptxClosingSlide(
  pptx: PptxGenJS,
  ctx: PptxBrandContext,
  companyName: string,
  periodLabel: string
): void {
  const p = ctx.palette;
  const slide = pptx.addSlide();
  slide.background = { color: p.primaryHex };

  if (p.logo) {
    addPptxLogo(slide, p.logo, SLIDE_W / 2 - 0.6, 0.8, 1.2, 0.65, true);
  }

  slide.addText("Merci", {
    x: 0.5,
    y: 2.15,
    w: 12.3,
    h: 0.8,
    fontSize: 34,
    bold: true,
    color: p.onPrimaryHex,
    align: "center",
  });
  slide.addText(truncateSlideText(`${companyName} · ${periodLabel}`, 70), {
    x: 0.5,
    y: 3.05,
    w: 12.3,
    h: 0.4,
    fontSize: 13,
    color: p.secondaryHex,
    align: "center",
    fit: "shrink",
  });
  slide.addText("Document confidentiel — usage direction", {
    x: 0.5,
    y: 3.55,
    w: 12.3,
    h: 0.35,
    fontSize: 10,
    color: p.onPrimaryMutedHex,
    align: "center",
  });
}

export function addPptxKpiCard(
  slide: PptxGenJS.Slide,
  ctx: PptxBrandContext,
  input: { x: number; y: number; w: number; h: number; label: string; value: string }
): void {
  const p = ctx.palette;
  slide.addShape("roundRect", {
    x: input.x,
    y: input.y,
    w: input.w,
    h: input.h,
    fill: { color: p.iceHex },
    line: { color: p.secondaryHex, width: 0.75 },
    rectRadius: 0.06,
  });
  slide.addShape("rect", {
    x: input.x,
    y: input.y,
    w: input.w,
    h: 0.1,
    fill: { color: p.primaryHex },
  });
  slide.addText(truncateSlideText(input.label, 45), {
    x: input.x + 0.12,
    y: input.y + 0.18,
    w: input.w - 0.22,
    h: 0.32,
    fontSize: 9,
    color: p.mutedHex,
    fit: "shrink",
    valign: "top",
  });
  slide.addText(truncateSlideText(String(input.value), 24), {
    x: input.x + 0.12,
    y: input.y + 0.48,
    w: input.w - 0.22,
    h: 0.48,
    fontSize: 17,
    bold: true,
    color: p.primaryHex,
    fit: "shrink",
    valign: "middle",
  });
}

export function addPptxInsightBox(
  slide: PptxGenJS.Slide,
  ctx: PptxBrandContext,
  items: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  title = "Points clés"
): void {
  const p = ctx.palette;
  slide.addShape("roundRect", {
    x,
    y,
    w,
    h,
    fill: { color: p.iceHex },
    line: { color: p.secondaryHex, width: 0.5 },
    rectRadius: 0.08,
  });
  slide.addText(title, {
    x: x + 0.15,
    y: y + 0.1,
    w: w - 0.3,
    h: 0.28,
    fontSize: 11,
    bold: true,
    color: p.secondaryDeepHex,
    fit: "shrink",
  });
  slide.addText(
    items.slice(0, 6).map((t) => ({
      text: truncateSlideText(t, 90),
      options: { bullet: true, breakLine: true },
    })),
    {
      x: x + 0.2,
      y: y + 0.4,
      w: w - 0.35,
      h: h - 0.48,
      fontSize: 9,
      color: p.slateHex,
      valign: "top",
      fit: "shrink",
    }
  );
}

export { CONTENT_TOP, CONTENT_WIDTH, FOOTER_Y, MARGIN, SLIDE_W };
