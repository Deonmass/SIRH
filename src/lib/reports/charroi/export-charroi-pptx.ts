import PptxGenJS from "pptxgenjs";
import { formatKm } from "@/lib/charroi-entretien";
import {
  addPptxBrandedFooter,
  addPptxBrandedHeader,
  addPptxCoverSlide,
  addPptxClosingSlide,
  addPptxKpiGrid,
  computePptxGrid,
  CONTENT_TOP,
  createPptxBrandContext,
} from "../pptx-brand-layout";
import { truncateSlideText } from "../report-brand-palette";
import type { CharroiReportData, CountRow } from "./types";

function addCountList(
  slide: PptxGenJS.Slide,
  ctx: ReturnType<typeof createPptxBrandContext>,
  title: string,
  rows: CountRow[],
  x: number,
  y: number,
  w: number
) {
  slide.addText(truncateSlideText(title, 40), {
    x,
    y,
    w,
    h: 0.32,
    fontSize: 11,
    bold: true,
    color: ctx.palette.primaryHex,
    fit: "shrink",
  });
  const lines = rows
    .slice(0, 8)
    .map((r) => `${truncateSlideText(r.label, 28)} : ${r.count}`);
  slide.addText(lines.join("\n"), {
    x,
    y: y + 0.38,
    w,
    h: 2.4,
    fontSize: 10,
    color: ctx.palette.slateHex,
    valign: "top",
    fit: "shrink",
  });
}

export async function buildCharroiReportPptx(data: CharroiReportData): Promise<Buffer> {
  const ctx = createPptxBrandContext(data.meta.branding);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = data.meta.companyName;
  pptx.title = data.meta.title;
  pptx.company = data.meta.companyName;

  addPptxCoverSlide(pptx, ctx, {
    companyName: data.meta.companyName,
    moduleLabel: "Charroi automobile",
    title: data.meta.title,
    periodLabel: data.meta.periodLabel,
    subtitle: data.meta.subtitle,
    dateRange: `${data.meta.dateFrom} → ${data.meta.dateTo}`,
    footerSection: "Couverture",
  });

  {
    const slide = pptx.addSlide();
    slide.background = { color: ctx.palette.whiteHex };
    addPptxBrandedHeader(slide, ctx, "Synthèse", data.meta.periodLabel);
    addPptxKpiGrid(slide, ctx, data.kpis.slice(0, 6), { cols: 3, maxItems: 6 });
    addPptxBrandedFooter(slide, ctx, data.meta.companyName, data.meta.periodLabel, "Synthèse");
  }

  {
    const slide = pptx.addSlide();
    slide.background = { color: ctx.palette.whiteHex };
    addPptxBrandedHeader(
      slide,
      ctx,
      "Parc automobile",
      `${data.parc.total} véhicules · ${data.parc.disponibles.length} disponibles`
    );
    const grid3 = computePptxGrid(3);
    addCountList(slide, ctx, "Par statut", data.parc.parStatut, grid3.cellX(0), CONTENT_TOP, grid3.colW);
    addCountList(slide, ctx, "Par marque", data.parc.parMarque, grid3.cellX(1), CONTENT_TOP, grid3.colW);
    addCountList(slide, ctx, "Par type", data.parc.parType, grid3.cellX(2), CONTENT_TOP, grid3.colW);
    addPptxBrandedFooter(slide, ctx, data.meta.companyName, data.meta.periodLabel, "Parc");
  }

  {
    const slide = pptx.addSlide();
    slide.background = { color: ctx.palette.whiteHex };
    addPptxBrandedHeader(
      slide,
      ctx,
      "Courses & mobilité",
      `${data.courses.total} courses · ${formatKm(data.courses.kmParcours)} parcourus`
    );
    const grid3 = computePptxGrid(3);
    addCountList(slide, ctx, "Par statut", data.courses.parStatut, grid3.cellX(0), CONTENT_TOP, grid3.colW);
    addCountList(slide, ctx, "Par type", data.courses.parType, grid3.cellX(1), CONTENT_TOP, grid3.colW);
    addCountList(slide, ctx, "Top chauffeurs", data.courses.parChauffeur, grid3.cellX(2), CONTENT_TOP, grid3.colW);
    addPptxBrandedFooter(slide, ctx, data.meta.companyName, data.meta.periodLabel, "Courses");
  }

  {
    const slide = pptx.addSlide();
    slide.background = { color: ctx.palette.whiteHex };
    addPptxBrandedHeader(
      slide,
      ctx,
      "Pannes",
      `${data.pannes.vehiculesEnPanne} hors service · ${data.pannes.eventsPeriode} événements`
    );
    const grid2 = computePptxGrid(2, 0.2);
    slide.addText(
      [
        `Déclarations : ${data.pannes.liste.filter((p) => p.enPanne).length}`,
        `Remises en service : ${data.pannes.remisesService}`,
        `En panne actuellement : ${data.pannes.vehiculesEnPanne}`,
      ].join("\n"),
      {
        x: grid2.cellX(0),
        y: CONTENT_TOP,
        w: grid2.colW,
        h: 1.4,
        fontSize: 11,
        color: ctx.palette.slateHex,
        fit: "shrink",
        valign: "top",
      }
    );
    addCountList(slide, ctx, "Par véhicule", data.pannes.parVehicule, grid2.cellX(1), CONTENT_TOP, grid2.colW);
    addPptxBrandedFooter(slide, ctx, data.meta.companyName, data.meta.periodLabel, "Pannes");
  }

  {
    const slide = pptx.addSlide();
    slide.background = { color: ctx.palette.whiteHex };
    addPptxBrandedHeader(
      slide,
      ctx,
      "Entretien",
      `${data.entretien.enRetard} en retard · ${data.entretien.historiquePeriode} réalisés`
    );
    const grid2 = computePptxGrid(2, 0.2);
    slide.addText(
      [
        `En retard : ${data.entretien.enRetard}`,
        `À planifier : ${data.entretien.aPlanifier}`,
        `À jour : ${data.entretien.aJour}`,
        `Km période : ${formatKm(data.entretien.kmParcoursPeriode)}`,
      ].join("\n"),
      {
        x: grid2.cellX(0),
        y: CONTENT_TOP,
        w: grid2.colW,
        h: 1.8,
        fontSize: 11,
        color: ctx.palette.slateHex,
        fit: "shrink",
        valign: "top",
      }
    );
    const alertLines = data.entretien.alertes
      .slice(0, 6)
      .map((a) => truncateSlideText(`${a.immatriculation} — ${a.alerte}`, 50));
    slide.addText(alertLines.join("\n") || "Aucune alerte", {
      x: grid2.cellX(1),
      y: CONTENT_TOP,
      w: grid2.colW,
      h: 2.2,
      fontSize: 9,
      color: ctx.palette.slateHex,
      valign: "top",
      fit: "shrink",
    });
    addPptxBrandedFooter(slide, ctx, data.meta.companyName, data.meta.periodLabel, "Entretien");
  }

  addPptxClosingSlide(pptx, ctx, data.meta.companyName, data.meta.periodLabel);

  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return buffer;
}
