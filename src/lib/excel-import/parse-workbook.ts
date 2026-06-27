import ExcelJS from "exceljs";
import {
  buildHeaderIndex,
  cellToString,
  pickCell,
  pickCellDate,
  pickCellNumber,
} from "./cell-utils";
import {
  normalizeEmployeImportRow,
  normalizePosteImportRow,
} from "./normalize-import";
import type { EmployeImportRow, PosteImportRow } from "./types";

const EMPLOYE_SHEET_NAMES = ["employes", "employés", "agents", "employees"];
const POSTE_SHEET_NAMES = ["postes", "fiches_poste", "fiches", "positions"];

function findSheet(workbook: ExcelJS.Workbook, names: string[]): ExcelJS.Worksheet | null {
  for (const sheet of workbook.worksheets) {
    const key = sheet.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (names.some((name) => key === name || key.includes(name))) return sheet;
  }
  return null;
}

function rowText(sheet: ExcelJS.Worksheet, rowNumber: number): string {
  const row = sheet.getRow(rowNumber);
  const parts: string[] = [];
  row.eachCell({ includeEmpty: false }, (cell) => {
    parts.push(cellToString(cell.value));
  });
  return parts.join(" ");
}

function detectEmployeHeaderRow(sheet: ExcelJS.Worksheet): number {
  const normalized = rowText(sheet, 1)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("profil") || normalized.includes("coordonne")) return 2;
  return 1;
}

function readHeaders(sheet: ExcelJS.Worksheet, headerRow = 1): Map<string, number> {
  const row = sheet.getRow(headerRow);
  const headers: string[] = [];
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = cellToString(cell.value);
  });
  return buildHeaderIndex(headers);
}

function isExampleRow(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    v.startsWith("ex:") ||
    v.startsWith("exemple") ||
    v === "example" ||
    v === "exemple (ignoré)" ||
    v === "exemple (ignore)"
  );
}

function isLegacyTemplateExample(prenom: string, nom: string): boolean {
  return prenom === "Jean" && nom === "Kabila";
}

export type EmployeParseResult = {
  rows: EmployeImportRow[];
  skippedLegacyExample: boolean;
};

export function parseEmployesSheet(sheet: ExcelJS.Worksheet): EmployeParseResult {
  const headerRow = detectEmployeHeaderRow(sheet);
  const headerIndex = readHeaders(sheet, headerRow);
  const rows: EmployeImportRow[] = [];
  let skippedLegacyExample = false;

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow) return;

    const prenom = pickCell(row, headerIndex, "prenom", "prénom");
    const nom = pickCell(row, headerIndex, "nom");
    const matricule = pickCell(row, headerIndex, "matricule");

    if (!prenom && !nom) return;
    if (isExampleRow(prenom) || isExampleRow(nom) || isExampleRow(matricule)) return;
    if (isLegacyTemplateExample(prenom, nom)) {
      skippedLegacyExample = true;
      return;
    }

    rows.push(
      normalizeEmployeImportRow({
      line: rowNumber,
      matricule: matricule || undefined,
      prenom,
      nom,
      postNom: pickCell(row, headerIndex, "post_nom", "postnom", "post-nom") || undefined,
      sexe: pickCell(row, headerIndex, "sexe") || undefined,
      dateNaissance:
        pickCellDate(row, headerIndex, "date_naissance", "date_naiss", "date_de_naissance") ||
        undefined,
      lieuNaissance:
        pickCell(row, headerIndex, "lieu_naissance", "lieu_naiss", "lieu_de_naissance") ||
        undefined,
      nationalite: pickCell(row, headerIndex, "nationalite", "nationalité") || undefined,
      statutMatrimonial:
        pickCell(
          row,
          headerIndex,
          "etat_civil",
          "état_civil",
          "statut_matrimonial",
          "statut_mat"
        ) || undefined,
      adresse: pickCell(row, headerIndex, "adresse") || undefined,
      email: pickCell(row, headerIndex, "email", "email_pro", "email pro") || undefined,
      telephone: pickCell(row, headerIndex, "telephone", "téléphone", "tel") || undefined,
      grade: pickCell(row, headerIndex, "grade") || undefined,
      departement: pickCell(row, headerIndex, "departement", "département") || undefined,
      intitulePoste:
        pickCell(row, headerIndex, "intitule_poste", "poste", "position") || undefined,
      typeContrat: pickCell(row, headerIndex, "type_contrat", "contrat") || undefined,
      statut: pickCell(row, headerIndex, "statut") || undefined,
      dateEmbauche: pickCell(row, headerIndex, "date_embauche", "embauche") || undefined,
      categorie: pickCellNumber(row, headerIndex, "categorie", "catégorie"),
      salaireBase: pickCellNumber(row, headerIndex, "salaire_base", "salaire"),
      devise: pickCell(row, headerIndex, "devise", "currency") || undefined,
      numeroCnss: pickCell(row, headerIndex, "numero_cnss", "cnss") || undefined,
      numeroOnem: pickCell(row, headerIndex, "numero_onem", "onem") || undefined,
      codePoste: pickCell(row, headerIndex, "code_poste", "poste_code") || undefined,
      })
    );
  });

  return { rows, skippedLegacyExample };
}

export function parsePostesSheet(sheet: ExcelJS.Worksheet): PosteImportRow[] {
  const headerIndex = readHeaders(sheet);
  const rows: PosteImportRow[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const intitule = pickCell(row, headerIndex, "intitule", "intitulé", "titre", "title");
    const departement = pickCell(row, headerIndex, "departement", "département");
    const code = pickCell(row, headerIndex, "code");

    if (!intitule && !departement) return;
    if (isExampleRow(intitule) || isExampleRow(code)) return;

    rows.push(
      normalizePosteImportRow({
      line: rowNumber,
      code: code || undefined,
      intitule,
      departement,
      grade: pickCell(row, headerIndex, "grade") || undefined,
      typeContrat: pickCell(row, headerIndex, "type_contrat", "contrat") || undefined,
      lieu: pickCell(row, headerIndex, "lieu", "location") || undefined,
      effectif: pickCellNumber(row, headerIndex, "effectif", "headcount"),
      description: pickCell(row, headerIndex, "description") || undefined,
      missions: pickCell(row, headerIndex, "missions") || undefined,
      exigences: pickCell(row, headerIndex, "exigences", "requirements") || undefined,
      competences: pickCell(row, headerIndex, "competences", "compétences") || undefined,
      kpi: pickCell(row, headerIndex, "kpi") || undefined,
      matriculeEmploye:
        pickCell(row, headerIndex, "matricule_employe", "matricule", "matricule_agent") ||
        undefined,
      salaireBase: pickCellNumber(row, headerIndex, "salaire_base", "salaire"),
      devise: pickCell(row, headerIndex, "devise", "currency") || undefined,
      })
    );
  });

  return rows.filter((r) => r.intitule.trim() && r.departement.trim());
}

export type ParseImportMeta = {
  skippedLegacyExample?: boolean;
};

export async function parseImportWorkbook(
  buffer: ArrayBuffer,
  kind: "employes" | "postes"
): Promise<EmployeImportRow[] | PosteImportRow[]> {
  const { rows } = await parseImportWorkbookDetailed(buffer, kind);
  return rows;
}

export async function parseImportWorkbookDetailed(
  buffer: ArrayBuffer,
  kind: "employes" | "postes"
): Promise<{
  rows: EmployeImportRow[] | PosteImportRow[];
  meta: ParseImportMeta;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const meta: ParseImportMeta = {};

  if (kind === "employes") {
    const sheet =
      findSheet(workbook, EMPLOYE_SHEET_NAMES) ?? workbook.worksheets[0] ?? null;
    if (!sheet) return { rows: [], meta };
    const result = parseEmployesSheet(sheet);
    meta.skippedLegacyExample = result.skippedLegacyExample;
    return { rows: result.rows, meta };
  }

  const sheet =
    findSheet(workbook, POSTE_SHEET_NAMES) ??
    (workbook.worksheets.length > 1 ? workbook.worksheets[1] : workbook.worksheets[0]) ??
    null;
  if (!sheet) return { rows: [], meta };
  return { rows: parsePostesSheet(sheet), meta };
}
