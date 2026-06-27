import ExcelJS from "exceljs";
import type { SanteDashboardData } from "@/lib/sante-dashboard";
import type { HopitalVisite } from "@/lib/repositories/hopital-visite";
import { getSanteVisiteStatut } from "@/lib/sante-visite";
import { SANTE_VISITE_VALIDATION_LABELS } from "@/lib/sante-visite";
import {
  EXCEL_COLORS,
  setMoneyFormat,
  styleHeaderRow,
  styleSectionTitle,
} from "@/lib/reports/excel-styles";

export async function buildSanteReportExcel(input: {
  companyName: string;
  periodLabel: string;
  dashboard: SanteDashboardData;
  visites: Array<HopitalVisite & { employeeName?: string }>;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SIRH RDC";
  wb.created = new Date();

  const synth = wb.addWorksheet("Synthèse", {
    properties: { tabColor: { argb: EXCEL_COLORS.accent } },
    views: [{ showGridLines: false }],
  });
  synth.columns = [{ width: 32 }, { width: 18 }, { width: 36 }];

  synth.mergeCells("A1:C1");
  synth.getCell("A1").value = input.companyName;
  synth.getCell("A1").font = { bold: true, size: 16, color: { argb: EXCEL_COLORS.headerBg } };
  synth.mergeCells("A2:C2");
  synth.getCell("A2").value = "Rapport Santé";
  synth.getCell("A2").font = { bold: true, size: 13, color: { argb: EXCEL_COLORS.accent } };
  synth.mergeCells("A3:C3");
  synth.getCell("A3").value = `${input.periodLabel} — généré le ${new Date().toLocaleString("fr-FR")}`;
  synth.getCell("A3").font = { size: 10, color: { argb: "FF64748B" } };

  let row = 5;
  synth.getCell(`A${row}`).value = "Indicateur";
  synth.getCell(`B${row}`).value = "Valeur";
  styleHeaderRow(synth, 2, row);

  const kpis = [
    ["Visites", input.dashboard.kpi.totalVisites],
    ["Montant total", input.dashboard.kpi.montantTotal],
    ["En attente", input.dashboard.kpi.enAttente],
    ["Validées", input.dashboard.kpi.validees],
    ["Rejetées", input.dashboard.kpi.rejetees],
  ] as const;

  kpis.forEach(([label, value]) => {
    row++;
    synth.getCell(`A${row}`).value = label;
    const cell = synth.getCell(`B${row}`);
    if (label === "Montant total") {
      cell.value = value;
      setMoneyFormat(cell);
    } else {
      cell.value = value;
    }
  });

  row += 2;
  synth.mergeCells(`A${row}:B${row}`);
  styleSectionTitle(synth.getCell(`A${row}`));
  synth.getCell(`A${row}`).value = "Top hôpitaux (montant)";
  input.dashboard.topHopitaux.forEach((h) => {
    row++;
    synth.getCell(`A${row}`).value = h.hopital;
    const cell = synth.getCell(`B${row}`);
    cell.value = h.montant;
    setMoneyFormat(cell);
  });

  const detail = wb.addWorksheet("Visites", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  detail.columns = [
    { width: 12 },
    { width: 14 },
    { width: 22 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 36 },
  ];
  detail.addRow([
    "Date",
    "Matricule",
    "Employé",
    "Hôpital",
    "Montant",
    "Statut",
    "Motif",
  ]);
  styleHeaderRow(detail, 7);

  input.visites.forEach((v) => {
    const statut = getSanteVisiteStatut(v.validation);
    const r = detail.addRow([
      v.dateVisite ?? "",
      v.matriculeAgent ?? "",
      v.employeeName ?? "",
      v.hopital ?? "",
      v.montant ?? 0,
      SANTE_VISITE_VALIDATION_LABELS[statut],
      v.motif ?? "",
    ]);
    setMoneyFormat(r.getCell(5));
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
