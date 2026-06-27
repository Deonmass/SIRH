import PptxGenJS from "pptxgenjs";
import {
  narrativeForSection,
  REPORT_SECTION_LABELS,
  sectionsForReport,
  type ReportSectionId,
} from "./report-narratives";
import {
  addPptxBrandedFooter,
  addPptxBrandedHeader,
  addPptxCoverSlide,
  addPptxClosingSlide,
  addPptxInsightBox,
  addPptxKpiGrid,
  CONTENT_TOP,
  CONTENT_WIDTH,
  createPptxBrandContext,
  MARGIN,
} from "./pptx-brand-layout";
import { truncateSlideText } from "./report-brand-palette";
import type { RhReportData } from "./types";

function addNarrativeParagraphs(
  slide: PptxGenJS.Slide,
  ctx: ReturnType<typeof createPptxBrandContext>,
  paragraphs: string[],
  x: number,
  y: number,
  w: number,
  h: number
) {
  slide.addText(
    paragraphs.slice(0, 4).map((p, i) => ({
      text: truncateSlideText(p, 220),
      options: { breakLine: true, paraSpaceAfter: i < paragraphs.length - 1 ? 8 : 0 },
    })),
    {
      x,
      y,
      w,
      h,
      fontSize: 10,
      color: ctx.palette.slateHex,
      valign: "top",
      fit: "shrink",
    }
  );
}

function addCoverSlide(pptx: PptxGenJS, data: RhReportData) {
  const ctx = createPptxBrandContext(data.meta.branding);
  const narrative = narrativeForSection(data, "synthese");

  addPptxCoverSlide(pptx, ctx, {
    companyName: data.meta.companyName,
    title: data.meta.title,
    periodLabel: data.meta.periodLabel,
    subtitle: data.meta.subtitle,
    footerSection: "Couverture",
    belowHeadline: narrative.headline,
    belowParagraphs: narrative.paragraphs.slice(0, 2),
  });
}

function addKpiSlide(pptx: PptxGenJS, data: RhReportData) {
  const ctx = createPptxBrandContext(data.meta.branding);
  const slide = pptx.addSlide();
  slide.background = { color: ctx.palette.whiteHex };
  addPptxBrandedHeader(slide, ctx, REPORT_SECTION_LABELS.synthese, "Indicateurs clés de pilotage");

  const narrative = narrativeForSection(data, "synthese");
  addPptxKpiGrid(slide, ctx, data.kpis.map((k) => ({ label: k.label, value: String(k.value) })), {
    cols: 3,
    rowH: 1.12,
    startY: CONTENT_TOP + 0.05,
  });

  slide.addText(truncateSlideText(narrative.chartCaption, 120), {
    x: MARGIN,
    y: 4.05,
    w: CONTENT_WIDTH,
    h: 0.35,
    fontSize: 9,
    italic: true,
    color: ctx.palette.mutedHex,
    fit: "shrink",
  });
  addPptxBrandedFooter(slide, ctx, data.meta.companyName, data.meta.periodLabel, REPORT_SECTION_LABELS.synthese);
}

function addSectionIntroSlide(pptx: PptxGenJS, data: RhReportData, sectionId: ReportSectionId) {
  const ctx = createPptxBrandContext(data.meta.branding);
  const slide = pptx.addSlide();
  slide.background = { color: ctx.palette.whiteHex };
  const label = REPORT_SECTION_LABELS[sectionId];
  const narrative = narrativeForSection(data, sectionId);
  addPptxBrandedHeader(slide, ctx, label, truncateSlideText(narrative.headline, 90));
  addNarrativeParagraphs(slide, ctx, narrative.paragraphs, MARGIN, CONTENT_TOP, 7.2, 3.2);
  addPptxInsightBox(slide, ctx, narrative.insights, 8.15, CONTENT_TOP, 4.75, 3.2);
  addPptxBrandedFooter(slide, ctx, data.meta.companyName, data.meta.periodLabel, label);
}

function addSectionChartSlide(pptx: PptxGenJS, data: RhReportData, sectionId: ReportSectionId) {
  const ctx = createPptxBrandContext(data.meta.branding);
  const slide = pptx.addSlide();
  slide.background = { color: ctx.palette.whiteHex };
  const label = REPORT_SECTION_LABELS[sectionId];
  const narrative = narrativeForSection(data, sectionId);
  const s = data.stats;
  const p = ctx.palette;

  addPptxBrandedHeader(slide, ctx, `${label} — analyse`, "Graphiques commentés");

  slide.addShape("roundRect", {
    x: MARGIN,
    y: CONTENT_TOP,
    w: CONTENT_WIDTH,
    h: 0.48,
    fill: { color: p.primaryHex },
    rectRadius: 0.04,
  });
  slide.addText(truncateSlideText(narrative.chartCaption, 130), {
    x: MARGIN + 0.12,
    y: CONTENT_TOP + 0.1,
    w: CONTENT_WIDTH - 0.24,
    h: 0.32,
    fontSize: 9,
    italic: true,
    color: p.onPrimaryMutedHex,
    fit: "shrink",
  });

  const chartOpts: PptxGenJS.IChartOpts = {
    x: MARGIN,
    y: CONTENT_TOP + 0.58,
    w: 7.6,
    h: 3.05,
    chartColors: [p.secondaryHex, p.primaryHex, p.secondaryDeepHex],
    showLegend: false,
    showTitle: true,
    titleFontSize: 10,
    catAxisLabelColor: p.slateHex,
    valAxisLabelColor: p.slateHex,
    barDir: "col",
  };

  switch (sectionId) {
    case "effectifs":
      slide.addChart(
        pptx.ChartType.bar,
        [
          {
            name: "Effectif",
            labels: s.byDepartment.slice(0, 8).map((d) => truncateSlideText(d.name, 14)),
            values: s.byDepartment.slice(0, 8).map((d) => d.count),
          },
        ],
        { ...chartOpts, title: "Effectif par département" }
      );
      break;
    case "paie":
      if (!data.meta.hideSalaries) {
        slide.addChart(
          pptx.ChartType.bar,
          [
            {
              name: "Masse nette k$",
              labels: s.paieMasseSeries.map((p) => truncateSlideText(p.monthLabel, 8)),
              values: s.paieMasseSeries.map((p) => Math.round(p.totalNet / 1000)),
            },
          ],
          { ...chartOpts, chartColors: [p.secondaryHex], title: "Masse nette (k$US)" }
        );
      } else {
        slide.addText("Données salariales masquées pour ce profil.", {
          x: MARGIN,
          y: 2.4,
          w: 7,
          h: 0.8,
          fontSize: 12,
          color: p.mutedHex,
        });
      }
      break;
    case "conges":
      slide.addChart(
        pptx.ChartType.bar,
        [
          {
            name: "Jours",
            labels: s.conges.byType.map((t) => truncateSlideText(t.label, 12)),
            values: s.conges.byType.map((t) => t.days),
          },
        ],
        { ...chartOpts, title: "Congés par type (jours)" }
      );
      break;
    case "pointage":
      slide.addChart(
        pptx.ChartType.bar,
        [
          {
            name: "Retards",
            labels: s.pointage.byDepartment.slice(0, 8).map((d) => truncateSlideText(d.department, 12)),
            values: s.pointage.byDepartment.slice(0, 8).map((d) => d.retards),
          },
        ],
        { ...chartOpts, chartColors: [p.primaryHex], title: "Retards par département" }
      );
      break;
    case "formations": {
      const trend = s.formations.monthlyTrend.filter((m) => data.monthsInScope.includes(m.month));
      slide.addChart(
        pptx.ChartType.bar,
        [
          {
            name: "Sessions",
            labels: trend.map((m) => truncateSlideText(m.month, 8)),
            values: trend.map((m) => m.aVenir + m.enCours + m.terminees),
          },
        ],
        { ...chartOpts, title: "Sessions formation / mois" }
      );
      break;
    }
    case "conformite":
      slide.addChart(
        pptx.ChartType.bar,
        [
          {
            name: "Agents",
            labels: s.dossierCompletion.map((d) => truncateSlideText(d.bracket, 10)),
            values: s.dossierCompletion.map((d) => d.count),
          },
        ],
        { ...chartOpts, title: "Complétion dossiers" }
      );
      break;
    case "mouvements":
      slide.addChart(
        pptx.ChartType.bar,
        [
          {
            name: "Mouvements",
            labels: s.movementSummary.map((m) => truncateSlideText(m.label, 14)),
            values: s.movementSummary.map((m) => m.count),
          },
        ],
        { ...chartOpts, title: "Mouvements RH" }
      );
      break;
    default:
      break;
  }

  const comment =
    narrative.paragraphs[narrative.paragraphs.length - 1] ??
    "Analyse basée sur les données SIRH à la date du rapport.";
  addPptxInsightBox(
    slide,
    ctx,
    [comment, ...narrative.insights.slice(0, 3)],
    8.15,
    CONTENT_TOP + 0.58,
    4.75,
    3.05,
    "Commentaire"
  );
  addPptxBrandedFooter(slide, ctx, data.meta.companyName, data.meta.periodLabel, `${label} — analyse`);
}

export async function buildRhReportPptx(data: RhReportData): Promise<Buffer> {
  const ctx = createPptxBrandContext(data.meta.branding);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = data.meta.companyName;
  pptx.title = data.meta.title;
  pptx.subject = data.meta.periodLabel;
  pptx.company = data.meta.companyName;

  addCoverSlide(pptx, data);
  addKpiSlide(pptx, data);

  const sections = sectionsForReport(data).filter((id) => id !== "synthese");
  for (const sectionId of sections) {
    addSectionIntroSlide(pptx, data, sectionId);
    addSectionChartSlide(pptx, data, sectionId);
  }

  addPptxClosingSlide(pptx, ctx, data.meta.companyName, data.meta.periodLabel);

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(output as ArrayBuffer);
}
