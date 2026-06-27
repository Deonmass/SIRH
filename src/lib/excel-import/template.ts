import ExcelJS from "exceljs";
import type { ImportKind } from "./types";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E293B" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFF8FAFC" },
  size: 11,
};

const EMPLOYE_PROFILE_HEADERS = [
  "Prénom*",
  "Nom*",
  "Post-nom",
  "Sexe",
  "Date de naissance",
  "Lieu de naissance",
  "Nationalité",
  "État civil",
] as const;

const EMPLOYE_COORDONNEES_HEADERS = ["Adresse", "Email pro", "Téléphone"] as const;

/** Aligné sur le formulaire « Nouvel employé » (profil + coordonnées). */
const EMPLOYE_HEADERS = [...EMPLOYE_PROFILE_HEADERS, ...EMPLOYE_COORDONNEES_HEADERS];

const POSTE_HEADERS = [
  "code",
  "intitule*",
  "departement*",
  "grade",
  "type_contrat",
  "lieu",
  "effectif",
  "description",
  "missions",
  "exigences",
  "competences",
  "kpi",
  "matricule_employe",
  "salaire_base",
  "devise",
];

const SECTION_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0F172A" },
};

const SECTION_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FF38BDF8" },
  size: 10,
};

function styleHeaderRow(sheet: ExcelJS.Worksheet, colCount: number, rowNumber = 1) {
  const row = sheet.getRow(rowNumber);
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF334155" } },
    };
  }
}

function addEmployesSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet("Employés");
  const profileCount = EMPLOYE_PROFILE_HEADERS.length;
  const coordCount = EMPLOYE_COORDONNEES_HEADERS.length;

  const sectionRow = sheet.addRow([
    "Profil",
    ...Array.from({ length: profileCount - 1 }, () => ""),
    "Coordonnées",
    ...Array.from({ length: coordCount - 1 }, () => ""),
  ]);
  sectionRow.height = 20;
  sheet.mergeCells(1, 1, 1, profileCount);
  sheet.mergeCells(1, profileCount + 1, 1, profileCount + coordCount);
  for (let c = 1; c <= profileCount + coordCount; c++) {
    const cell = sectionRow.getCell(c);
    cell.fill = SECTION_FILL;
    cell.font = SECTION_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF1E293B" } } };
  }

  sheet.addRow(EMPLOYE_HEADERS);
  styleHeaderRow(sheet, EMPLOYE_HEADERS.length, 2);
  sheet.views = [{ state: "frozen", ySplit: 2 }];

  EMPLOYE_HEADERS.forEach((header, i) => {
    sheet.getColumn(i + 1).width = header === "Adresse" ? 28 : 16;
  });
}

function addPostesSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet("Postes");
  sheet.addRow(POSTE_HEADERS);
  styleHeaderRow(sheet, POSTE_HEADERS.length);
  POSTE_HEADERS.forEach((_, i) => {
    sheet.getColumn(i + 1).width = i === 7 || i === 8 || i === 9 || i === 10 ? 28 : 16;
  });
}

function addInstructionsSheet(workbook: ExcelJS.Workbook, kind: ImportKind) {
  const sheet = workbook.addWorksheet("Instructions");
  const employeLines = [
    "Feuille « Employés » — ligne 1 = sections Profil / Coordonnées, ligne 2 = en-têtes, données dès la ligne 3.",
    "Prénom* et Nom* obligatoires. Colonnes Coordonnées : Adresse, Email pro, Téléphone (comme « Nouvel employé »).",
    "Matricule généré automatiquement. Formats : dates JJ/MM/AAAA ou AAAA-MM-JJ ; sexe M/F ;",
    "état civil Célibataire/Marié(e)/Divorcé(e)/Veuf(ve) ; téléphone avec ou sans +243.",
  ];
  const posteLines = [
    "Feuille « Postes » — remplir à partir de la ligne 2.",
    "Intitulé* et Département* obligatoires. Code généré si vide.",
  ];
  const lines = [
    "Import SIRH RDC — modèle Excel",
    "",
    ...(kind === "employes" || kind === "complet" ? employeLines : []),
    ...(kind === "postes" || kind === "complet" ? ["", ...posteLines] : []),
  ];
  lines.forEach((line, i) => {
    const row = sheet.addRow([line]);
    if (i === 0) row.getCell(1).font = { bold: true, size: 13, color: { argb: "FFF1F5F9" } };
    else if (line) row.getCell(1).font = { size: 11, color: { argb: "FFCBD5E1" } };
  });
  sheet.getColumn(1).width = 96;
}

export async function buildImportTemplate(kind: ImportKind): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIRH RDC";
  workbook.created = new Date();

  if (kind === "employes" || kind === "complet") addEmployesSheet(workbook);
  if (kind === "postes" || kind === "complet") addPostesSheet(workbook);
  addInstructionsSheet(workbook, kind);

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export function templateFilename(kind: ImportKind): string {
  if (kind === "employes") return "modele_import_agents.xlsx";
  if (kind === "postes") return "modele_import_postes.xlsx";
  return "modele_import_agents_postes.xlsx";
}
