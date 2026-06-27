import ExcelJS from "exceljs";
import { buildEmployeeAnnexRows } from "./build-rh-report";
import {
  EXCEL_COLORS,
  setMoneyFormat,
  setNumberFormat,
  styleHeaderRow,
  styleSectionTitle,
  styleTotalRow,
} from "./excel-styles";
import type { RhReportData } from "./types";

function addSynthèseSheet(wb: ExcelJS.Workbook, data: RhReportData) {
  const sheet = wb.addWorksheet("Synthèse", {
    properties: { tabColor: { argb: EXCEL_COLORS.accent } },
    views: [{ showGridLines: false }],
  });
  sheet.columns = [{ width: 28 }, { width: 22 }, { width: 36 }];

  sheet.mergeCells("A1:C1");
  const title = sheet.getCell("A1");
  title.value = data.meta.companyName;
  title.font = { bold: true, size: 16, color: { argb: EXCEL_COLORS.headerBg } };

  sheet.mergeCells("A2:C2");
  sheet.getCell("A2").value = data.meta.title;
  sheet.getCell("A2").font = { bold: true, size: 13, color: { argb: EXCEL_COLORS.accent } };

  sheet.mergeCells("A3:C3");
  sheet.getCell("A3").value = `${data.meta.periodLabel} — généré le ${new Date(data.meta.generatedAt).toLocaleString("fr-FR")}`;
  sheet.getCell("A3").font = { size: 10, color: { argb: "FF64748B" } };

  let row = 5;
  sheet.getCell(`A${row}`).value = "Indicateur clé";
  sheet.getCell(`B${row}`).value = "Valeur";
  sheet.getCell(`C${row}`).value = "Commentaire";
  styleHeaderRow(sheet, 3, row);

  data.kpis.forEach((kpi) => {
    row++;
    sheet.getCell(`A${row}`).value = kpi.label;
    sheet.getCell(`B${row}`).value = kpi.value;
    sheet.getCell(`C${row}`).value = kpi.hint ?? "";
    sheet.getRow(row).getCell(1).font = { bold: true };
  });

  row += 2;
  sheet.mergeCells(`A${row}:C${row}`);
  styleSectionTitle(sheet.getCell(`A${row}`));
  sheet.getCell(`A${row}`).value = "Liens vers les onglets détaillés";
  row++;
  const links = [
    "Effectifs → onglet Effectifs",
    "Paie → onglet Paie",
    "Congés → onglet Congés",
    "Pointage → onglet Pointage",
    "Formations → onglet Formations",
    "Conformité → onglet Conformité",
  ];
  if (data.meta.type === "complet") links.push("Détail agents → onglet Agents");
  links.forEach((text) => {
    row++;
    sheet.getCell(`A${row}`).value = text;
  });
}

function addEffectifsSheet(wb: ExcelJS.Workbook, data: RhReportData) {
  const sheet = wb.addWorksheet("Effectifs", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { width: 12 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
  ];
  sheet.addRow(["Mois", "Effectif", "Entrées", "Sorties", "Variation"]);
  styleHeaderRow(sheet, 5);

  const startRow = 2;
  data.stats.headcountTrend.forEach((r, i) => {
    const rowNum = startRow + i;
    sheet.addRow([r.month, r.effectif, r.entrees, r.sorties, null]);
    sheet.getCell(`E${rowNum}`).value = { formula: `C${rowNum}-D${rowNum}` };
    setNumberFormat(sheet.getCell(`B${rowNum}`));
    setNumberFormat(sheet.getCell(`C${rowNum}`));
    setNumberFormat(sheet.getCell(`D${rowNum}`));
    setNumberFormat(sheet.getCell(`E${rowNum}`));
  });

  const totalRow = sheet.rowCount + 1;
  sheet.addRow(["TOTAL / MOY", null, null, null, null]);
  const tr = sheet.getRow(totalRow);
  tr.getCell(2).value = { formula: `AVERAGE(B${startRow}:B${totalRow - 1})` };
  tr.getCell(3).value = { formula: `SUM(C${startRow}:C${totalRow - 1})` };
  tr.getCell(4).value = { formula: `SUM(D${startRow}:D${totalRow - 1})` };
  tr.getCell(5).value = { formula: `C${totalRow}-D${totalRow}` };
  styleTotalRow(tr, 5);
  setNumberFormat(tr.getCell(2), 1);

  let r = totalRow + 2;
  sheet.getCell(`A${r}`).value = "Répartition par statut";
  styleSectionTitle(sheet.getCell(`A${r}`));
  r++;
  sheet.addRow(["Statut", "Effectif", "%"]);
  styleHeaderRow(sheet, 3, r);
  const statusStart = r + 1;
  const totalActive = data.stats.activeEmployees || 1;
  data.stats.byStatus.forEach((s) => {
    r++;
    sheet.addRow([s.label, s.count, s.count / totalActive]);
    sheet.getCell(`C${r}`).numFmt = "0.0%";
  });
  r++;
  sheet.addRow(["Total", null, null]);
  sheet.getCell(`B${r}`).value = { formula: `SUM(B${statusStart}:B${r - 1})` };
  styleTotalRow(sheet.getRow(r), 3);

  r += 2;
  sheet.getCell(`A${r}`).value = "Par département";
  styleSectionTitle(sheet.getCell(`A${r}`));
  r++;
  sheet.addRow(["Département", "Effectif"]);
  styleHeaderRow(sheet, 2, r);
  const deptStart = r + 1;
  data.stats.byDepartment.forEach((d) => {
    r++;
    sheet.addRow([d.name, d.count]);
  });
  r++;
  sheet.addRow(["Total", null]);
  sheet.getCell(`B${r}`).value = { formula: `SUM(B${deptStart}:B${r - 1})` };
  styleTotalRow(sheet.getRow(r), 2);
}

function addPaieSheet(wb: ExcelJS.Workbook, data: RhReportData) {
  const sheet = wb.addWorksheet("Paie", { views: [{ state: "frozen", ySplit: 1 }] });
  const hide = data.meta.hideSalaries;
  sheet.columns = [{ width: 12 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 14 }];
  sheet.addRow(["Mois", "Masse brute", "Masse nette", "Coût employeur", "Agents"]);
  styleHeaderRow(sheet, 5);

  const start = 2;
  if (hide) {
    sheet.addRow(["—", "Masqué", "Masqué", "Masqué", data.stats.paieCurrentMasse.employeeCount]);
  } else {
    data.stats.paieMasseSeries.forEach((p, i) => {
      const rowNum = start + i;
      sheet.addRow([
        p.monthLabel,
        p.totalGross,
        p.totalNet,
        p.totalEmployerCost,
        "",
      ]);
      setMoneyFormat(sheet.getCell(`B${rowNum}`));
      setMoneyFormat(sheet.getCell(`C${rowNum}`));
      setMoneyFormat(sheet.getCell(`D${rowNum}`));
      setNumberFormat(sheet.getCell(`E${rowNum}`));
    });
    const totalRow = sheet.rowCount + 1;
    sheet.addRow(["TOTAL", null, null, null, null]);
    const tr = sheet.getRow(totalRow);
    tr.getCell(2).value = { formula: `SUM(B${start}:B${totalRow - 1})` };
    tr.getCell(3).value = { formula: `SUM(C${start}:C${totalRow - 1})` };
    tr.getCell(4).value = { formula: `SUM(D${start}:D${totalRow - 1})` };
    tr.getCell(5).value = "";
    styleTotalRow(tr, 5);
    setMoneyFormat(tr.getCell(2));
    setMoneyFormat(tr.getCell(3));
    setMoneyFormat(tr.getCell(4));
  }

  let r = sheet.rowCount + 2;
  sheet.getCell(`A${r}`).value = "Paie par département (mois courant)";
  styleSectionTitle(sheet.getCell(`A${r}`));
  r++;
  sheet.addRow(["Département", "Agents", "Brut", "Net", "Coût employeur"]);
  styleHeaderRow(sheet, 5, r);
  const deptStart = r + 1;
  data.stats.paieByDepartment.forEach((d) => {
    r++;
    if (hide) {
      sheet.addRow([d.department, d.count, "—", "—", "—"]);
    } else {
      sheet.addRow([d.department, d.count, d.gross, d.net, d.employerCost]);
      setMoneyFormat(sheet.getCell(`C${r}`));
      setMoneyFormat(sheet.getCell(`D${r}`));
      setMoneyFormat(sheet.getCell(`E${r}`));
    }
  });
  if (!hide && data.stats.paieByDepartment.length > 0) {
    r++;
    sheet.addRow(["TOTAL", null, null, null, null]);
    sheet.getCell(`B${r}`).value = { formula: `SUM(B${deptStart}:B${r - 1})` };
    sheet.getCell(`C${r}`).value = { formula: `SUM(C${deptStart}:C${r - 1})` };
    sheet.getCell(`D${r}`).value = { formula: `SUM(D${deptStart}:D${r - 1})` };
    sheet.getCell(`E${r}`).value = { formula: `SUM(E${deptStart}:E${r - 1})` };
    styleTotalRow(sheet.getRow(r), 5);
    setMoneyFormat(sheet.getCell(`C${r}`));
    setMoneyFormat(sheet.getCell(`D${r}`));
    setMoneyFormat(sheet.getCell(`E${r}`));
  }
}

function addCongesSheet(wb: ExcelJS.Workbook, data: RhReportData) {
  const sheet = wb.addWorksheet("Congés");
  sheet.columns = [{ width: 22 }, { width: 14 }, { width: 14 }];
  sheet.addRow(["Type de congé", "Demandes", "Jours"]);
  styleHeaderRow(sheet, 3);
  const start = 2;
  data.stats.conges.byType.forEach((t, i) => {
    sheet.addRow([t.type, t.count, t.days]);
    setNumberFormat(sheet.getCell(`B${start + i}`));
    setNumberFormat(sheet.getCell(`C${start + i}`));
  });
  const totalRow = sheet.rowCount + 1;
  sheet.addRow(["TOTAL", null, null]);
  sheet.getCell(`B${totalRow}`).value = { formula: `SUM(B${start}:B${totalRow - 1})` };
  sheet.getCell(`C${totalRow}`).value = { formula: `SUM(C${start}:C${totalRow - 1})` };
  styleTotalRow(sheet.getRow(totalRow), 3);

  let r = totalRow + 2;
  sheet.getCell(`A${r}`).value = "Par département";
  styleSectionTitle(sheet.getCell(`A${r}`));
  r++;
  sheet.addRow(["Département", "Demandes", "En congé"]);
  styleHeaderRow(sheet, 3, r);
  data.stats.conges.byDepartment.forEach((d) => {
    r++;
    sheet.addRow([d.department, d.count, d.onLeave]);
  });
}

function addPointageSheet(wb: ExcelJS.Workbook, data: RhReportData) {
  const p = data.stats.pointage;
  const sheet = wb.addWorksheet("Pointage");
  sheet.columns = [{ width: 28 }, { width: 16 }];
  const rows: [string, string | number][] = [
    ["Période", p.moisAnnee],
    ["Agents actifs", p.totalActifs],
    ["Feuilles saisies", p.feuillesSaisies],
    ["Taux de saisie", `${p.saisieRate} %`],
    ["Feuilles verrouillées", p.feuillesVerrouillees],
    ["Total retards", p.totalRetards],
    ["Heures supplémentaires", p.totalHeuresSup],
    ["Absences non justifiées", p.totalAbsencesNonJustifiees],
    ["Moy. jours présents", p.avgJoursPresents],
  ];
  rows.forEach(([k, v]) => {
    const row = sheet.addRow([k, v]);
    row.getCell(1).font = { bold: true };
  });

  let r = sheet.rowCount + 2;
  sheet.getCell(`A${r}`).value = "Par département";
  styleSectionTitle(sheet.getCell(`A${r}`));
  r++;
  sheet.addRow(["Département", "Retards", "Absences", "H. sup."]);
  styleHeaderRow(sheet, 4, r);
  p.byDepartment.forEach((d) => {
    r++;
    sheet.addRow([d.department, d.retards, d.absences, d.heuresSup]);
  });
}

function addFormationsSheet(wb: ExcelJS.Workbook, data: RhReportData) {
  const f = data.stats.formations;
  const sheet = wb.addWorksheet("Formations");
  sheet.columns = [{ width: 28 }, { width: 14 }];
  [
    ["Sessions totales", f.total],
    ["Participants", f.totalParticipants],
    ["À venir", f.aVenir],
    ["En cours", f.enCours],
    ["Terminées", f.terminees],
  ].forEach(([k, v]) => sheet.addRow([k, v]));

  let r = sheet.rowCount + 2;
  sheet.getCell(`A${r}`).value = "Tendance mensuelle";
  styleSectionTitle(sheet.getCell(`A${r}`));
  r++;
  sheet.addRow(["Mois", "À venir", "En cours", "Terminées"]);
  styleHeaderRow(sheet, 4, r);
  const start = r + 1;
  f.monthlyTrend
    .filter((m) => data.monthsInScope.includes(m.month))
    .forEach((m, i) => {
      const rowNum = start + i;
      sheet.addRow([m.month, m.aVenir, m.enCours, m.terminees]);
      setNumberFormat(sheet.getCell(`B${rowNum}`));
      setNumberFormat(sheet.getCell(`C${rowNum}`));
      setNumberFormat(sheet.getCell(`D${rowNum}`));
    });
}

function addConformiteSheet(wb: ExcelJS.Workbook, data: RhReportData) {
  const c = data.stats.conformite;
  const sheet = wb.addWorksheet("Conformité");
  sheet.columns = [{ width: 32 }, { width: 16 }];
  [
    ["Taux conformité documents", `${data.stats.documentComplianceRate} %`],
    ["Dossiers incomplets", c.incompleteDossiers ?? 0],
    ["Pièces manquantes", c.missingDocsTotal],
    ["Masse cotisable CNSS", data.meta.hideSalaries ? "—" : c.cnssMasseCotisable ?? 0],
  ].forEach(([k, v]) => sheet.addRow([k, v]));

  let r = sheet.rowCount + 2;
  sheet.getCell(`A${r}`).value = "Complétion dossiers";
  styleSectionTitle(sheet.getCell(`A${r}`));
  r++;
  sheet.addRow(["Tranche", "Agents"]);
  styleHeaderRow(sheet, 2, r);
  data.stats.dossierCompletion.forEach((d) => {
    r++;
    sheet.addRow([d.bracket, d.count]);
  });
}

function addMouvementsSheet(wb: ExcelJS.Workbook, data: RhReportData) {
  const sheet = wb.addWorksheet("Mouvements");
  sheet.columns = [{ width: 28 }, { width: 12 }];
  sheet.addRow(["Type de mouvement", "Nombre"]);
  styleHeaderRow(sheet, 2);
  const start = 2;
  data.stats.movementSummary.forEach((m, i) => {
    sheet.addRow([m.label, m.count]);
    setNumberFormat(sheet.getCell(`B${start + 1 + i}`));
  });
}

function addAgentsSheet(wb: ExcelJS.Workbook, data: RhReportData, employees: ReturnType<typeof buildEmployeeAnnexRows>) {
  const sheet = wb.addWorksheet("Agents", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { width: 14 },
    { width: 28 },
    { width: 22 },
    { width: 14 },
    { width: 12 },
    { width: 16 },
    { width: 14 },
  ];
  sheet.addRow(["Matricule", "Nom", "Département", "Grade", "Statut", "Salaire base", "Embauche"]);
  styleHeaderRow(sheet, 7);
  employees.forEach((e) => sheet.addRow(Object.values(e)));
}

export async function buildRhReportExcel(
  data: RhReportData,
  employeesAnnex?: ReturnType<typeof buildEmployeeAnnexRows>
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SIRH RDC";
  wb.created = new Date();
  wb.title = data.meta.title;

  addSynthèseSheet(wb, data);
  addEffectifsSheet(wb, data);
  addPaieSheet(wb, data);
  addCongesSheet(wb, data);
  addPointageSheet(wb, data);
  addFormationsSheet(wb, data);
  addConformiteSheet(wb, data);

  if (data.meta.type === "complet" || data.meta.type === "annuel") {
    addMouvementsSheet(wb, data);
  }
  if (data.meta.type === "complet" && employeesAnnex?.length) {
    addAgentsSheet(wb, data, employeesAnnex);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
