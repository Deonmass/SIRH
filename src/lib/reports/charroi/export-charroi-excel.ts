import ExcelJS from "exceljs";
import {
  EXCEL_COLORS,
  styleHeaderRow,
  styleSectionTitle,
} from "../excel-styles";
import type { CharroiReportData, CountRow } from "./types";

function addCoverSheet(wb: ExcelJS.Workbook, data: CharroiReportData) {
  const sheet = wb.addWorksheet("Couverture", {
    properties: { tabColor: { argb: EXCEL_COLORS.accent } },
    views: [{ showGridLines: false }],
  });
  sheet.columns = [{ width: 18 }, { width: 22 }, { width: 40 }];

  sheet.mergeCells("A1:C1");
  const t1 = sheet.getCell("A1");
  t1.value = data.meta.companyName;
  t1.font = { bold: true, size: 18, color: { argb: EXCEL_COLORS.headerBg } };

  sheet.mergeCells("A2:C2");
  sheet.getCell("A2").value = "Module Charroi automobile";
  sheet.getCell("A2").font = { bold: true, size: 14, color: { argb: EXCEL_COLORS.accent } };

  sheet.mergeCells("A3:C3");
  sheet.getCell("A3").value = data.meta.title;
  sheet.getCell("A3").font = { bold: true, size: 12, color: { argb: EXCEL_COLORS.sectionBg } };

  sheet.mergeCells("A4:C4");
  sheet.getCell("A4").value = `${data.meta.periodLabel} (${data.meta.dateFrom} → ${data.meta.dateTo})`;
  sheet.getCell("A4").font = { size: 11, color: { argb: "FF64748B" } };

  sheet.mergeCells("A5:C5");
  sheet.getCell("A5").value = data.meta.subtitle;
  sheet.getCell("A5").font = { italic: true, size: 10, color: { argb: "FF64748B" } };

  sheet.mergeCells("A7:C7");
  sheet.getCell("A7").value = `Généré le ${new Date(data.meta.generatedAt).toLocaleString("fr-FR")}`;
  sheet.getCell("A7").font = { size: 9, color: { argb: "FF94A3B8" } };

  let row = 9;
  sheet.mergeCells(`A${row}:C${row}`);
  styleSectionTitle(sheet.getCell(`A${row}`));
  sheet.getCell(`A${row}`).value = "Indicateurs clés";
  row++;
  sheet.getCell(`A${row}`).value = "Indicateur";
  sheet.getCell(`B${row}`).value = "Valeur";
  sheet.getCell(`C${row}`).value = "Commentaire";
  styleHeaderRow(sheet, 3, row);
  data.kpis.forEach((kpi) => {
    row++;
    sheet.getCell(`A${row}`).value = kpi.label;
    sheet.getCell(`B${row}`).value = kpi.value;
    sheet.getCell(`C${row}`).value = kpi.hint ?? "";
  });
}

function addCountSheet(
  wb: ExcelJS.Workbook,
  name: string,
  title: string,
  rows: CountRow[]
) {
  const sheet = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 2 }] });
  sheet.columns = [{ width: 36 }, { width: 14 }];
  sheet.mergeCells("A1:B1");
  styleSectionTitle(sheet.getCell("A1"));
  sheet.getCell("A1").value = title;
  sheet.addRow(["Libellé", "Nombre"]);
  styleHeaderRow(sheet, 2, 2);
  rows.forEach((r) => sheet.addRow([r.label, r.count]));
}

function addParcSheet(wb: ExcelJS.Workbook, data: CharroiReportData) {
  const sheet = wb.addWorksheet("Parc", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 12 },
  ];
  sheet.addRow(["Immatriculation", "Marque", "Type", "Statut", "Km actuel"]);
  styleHeaderRow(sheet, 5);
  data.parc.liste.forEach((v) => {
    sheet.addRow([
      v.immatriculation,
      v.marque,
      v.type,
      v.statut,
      v.kmActuel != null ? v.kmActuel : "",
    ]);
  });
}

function addCoursesSheet(wb: ExcelJS.Workbook, data: CharroiReportData) {
  const sheet = wb.addWorksheet("Courses", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 14 },
    { width: 18 },
    { width: 12 },
    { width: 10 },
  ];
  sheet.addRow([
    "Date",
    "Demandeur",
    "Chauffeur",
    "Type",
    "Véhicule",
    "Destination",
    "Statut",
    "Km",
  ]);
  styleHeaderRow(sheet, 8);
  data.courses.liste.forEach((c) => {
    sheet.addRow([
      c.date,
      c.demandeur,
      c.chauffeur,
      c.type,
      c.vehicule,
      c.destination,
      c.statut,
      c.kmParcours ?? "",
    ]);
  });
}

function addPannesSheet(wb: ExcelJS.Workbook, data: CharroiReportData) {
  const sheet = wb.addWorksheet("Pannes", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 40 },
  ];
  sheet.addRow(["Date", "Immatriculation", "Marque", "Événement", "Description"]);
  styleHeaderRow(sheet, 5);
  data.pannes.liste.forEach((p) => {
    sheet.addRow([
      p.date,
      p.immatriculation,
      p.marque,
      p.enPanne ? "Panne" : "Remise en service",
      p.description,
    ]);
  });
}

function addEntretienSheet(wb: ExcelJS.Workbook, data: CharroiReportData) {
  const alertes = wb.addWorksheet("Entretien alertes", { views: [{ state: "frozen", ySplit: 1 }] });
  alertes.columns = [
    { width: 14 },
    { width: 14 },
    { width: 28 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];
  alertes.addRow([
    "Immatriculation",
    "Marque",
    "Alerte",
    "Km actuel",
    "Prochain km",
    "Dernier entretien",
  ]);
  styleHeaderRow(alertes, 6);
  data.entretien.alertes.forEach((e) => {
    alertes.addRow([
      e.immatriculation,
      e.marque,
      e.alerte,
      e.kmActuel ?? "",
      e.prochainKm ?? "",
      e.dernierEntretien ?? "",
    ]);
  });

  const hist = wb.addWorksheet("Entretien historique", { views: [{ state: "frozen", ySplit: 1 }] });
  hist.columns = [
    { width: 12 },
    { width: 14 },
    { width: 30 },
    { width: 10 },
    { width: 18 },
    { width: 10 },
  ];
  hist.addRow(["Date", "Véhicule", "Types", "Km", "Prestataire", "Coût"]);
  styleHeaderRow(hist, 6);
  data.entretien.historique.forEach((h) => {
    hist.addRow([h.date, h.immatriculation, h.types, h.km ?? "", h.prestataire, h.cout ?? ""]);
  });
}

export async function buildCharroiReportExcel(data: CharroiReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = data.meta.companyName;
  wb.created = new Date(data.meta.generatedAt);

  addCoverSheet(wb, data);
  addCountSheet(wb, "Statuts parc", "Répartition par statut", data.parc.parStatut);
  addCountSheet(wb, "Marques", "Véhicules par marque", data.parc.parMarque);
  addCountSheet(wb, "Types véhicule", "Véhicules par type", data.parc.parType);
  addParcSheet(wb, data);
  addCountSheet(wb, "Courses statuts", "Courses par statut", data.courses.parStatut);
  addCountSheet(wb, "Courses types", "Courses par type", data.courses.parType);
  addCountSheet(wb, "Chauffeurs", "Courses par chauffeur", data.courses.parChauffeur);
  addCoursesSheet(wb, data);
  addCountSheet(wb, "Pannes véhicules", "Pannes déclarées par véhicule", data.pannes.parVehicule);
  addPannesSheet(wb, data);
  addEntretienSheet(wb, data);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
