import ExcelJS from "exceljs";
import {
  normalizeStatutTechnique,
  parseCvValue,
  parseKmValue,
  parseMiseCirculationYear,
} from "@/lib/charroi-vehicule-declaration";
import { cellToString } from "./cell-utils";
import type { VehiculeImportRow } from "./vehicule-import.types";

function normalizeHeaderRowText(sheet: ExcelJS.Worksheet, rowNumber: number): string {
  const row = sheet.getRow(rowNumber);
  const parts: string[] = [];
  row.eachCell({ includeEmpty: false }, (cell) => {
    parts.push(cellToString(cell.value));
  });
  return parts.join(" ").toLowerCase();
}

function detectVehiculeHeaderRow(sheet: ExcelJS.Worksheet): number {
  const max = Math.min(sheet.rowCount, 40);
  for (let i = 1; i <= max; i++) {
    const text = normalizeHeaderRowText(sheet, i);
    if (text.includes("marque") && (text.includes("plaque") || text.includes("chassis"))) {
      return i;
    }
  }
  return 1;
}

function vehiculeNormalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function readHeaders(sheet: ExcelJS.Worksheet, headerRow: number): Map<string, number> {
  const row = sheet.getRow(headerRow);
  const headers: string[] = [];
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = cellToString(cell.value);
  });
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    const key = vehiculeNormalizeHeader(header);
    if (key && !map.has(key)) map.set(key, index);
  });
  return map;
}

function pickVehiculeCell(
  row: ExcelJS.Row,
  headerIndex: Map<string, number>,
  ...aliases: string[]
): string {
  for (const alias of aliases) {
    const idx = headerIndex.get(vehiculeNormalizeHeader(alias));
    if (idx == null) continue;
    const value = cellToString(row.getCell(idx + 1).value);
    if (value) return value;
  }
  return "";
}

function pickVehiculeNumber(
  row: ExcelJS.Row,
  headerIndex: Map<string, number>,
  ...aliases: string[]
): number | undefined {
  const raw = pickVehiculeCell(row, headerIndex, ...aliases);
  if (!raw) return undefined;
  const n = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function isExampleRow(marque: string, plaque: string): boolean {
  const m = marque.trim().toLowerCase();
  return m.startsWith("ex:") || m.startsWith("exemple") || plaque.toLowerCase().startsWith("ex:");
}

export function parseVehiculesSheet(sheet: ExcelJS.Worksheet): VehiculeImportRow[] {
  const headerRow = detectVehiculeHeaderRow(sheet);
  const headerIndex = readHeaders(sheet, headerRow);
  const rows: VehiculeImportRow[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow) return;

    const marque = pickVehiculeCell(row, headerIndex, "marque");
    const plaque = pickVehiculeCell(row, headerIndex, "plaque");
    const chassis = pickVehiculeCell(row, headerIndex, "n_chassis", "no_chassis", "numero_chassis", "n°chassis");

    if (!marque && !plaque && !chassis) return;
    if (isExampleRow(marque, plaque)) return;
    if (!marque.trim()) return;

    const statutRaw =
      pickVehiculeCell(row, headerIndex, "observation_tech", "observation tech", "observation") ||
      pickVehiculeCell(row, headerIndex, "statut");
    const statutNorm = normalizeStatutTechnique(statutRaw);

    rows.push({
      line: rowNumber,
      marque: marque.trim(),
      vehicleType: pickVehiculeCell(row, headerIndex, "type") || undefined,
      numeroChassis: chassis || undefined,
      plaque: plaque || undefined,
      cv:
        parseCvValue(pickVehiculeCell(row, headerIndex, "cv")) ??
        pickVehiculeNumber(row, headerIndex, "cv"),
      assureur: pickVehiculeCell(row, headerIndex, "assureur") || undefined,
      departement: pickVehiculeCell(row, headerIndex, "departement", "département") || undefined,
      utilisateur:
        pickVehiculeCell(row, headerIndex, "user", "utilisateur", "utilisateurs") || undefined,
      province:
        pickVehiculeCell(row, headerIndex, "provence", "province", "provenance") || undefined,
      societeProprietaire:
        pickVehiculeCell(row, headerIndex, "ppc_loxea", "ppc & loxea", "societe_proprietaire") ||
        undefined,
      kilometrageInitiale:
        parseKmValue(pickVehiculeCell(row, headerIndex, "km_h", "km/h", "km", "kilometrage")) ??
        pickVehiculeNumber(row, headerIndex, "km_h", "km/h"),
      miseCirculation:
        parseMiseCirculationYear(
          pickVehiculeCell(row, headerIndex, "mise_circulation", "mise circulation")
        ) ?? undefined,
      statut: statutNorm ?? (statutRaw.trim() || undefined),
    });
  });

  return rows;
}

export async function parseVehiculesWorkbook(buffer: ArrayBuffer): Promise<VehiculeImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  return parseVehiculesSheet(sheet);
}
