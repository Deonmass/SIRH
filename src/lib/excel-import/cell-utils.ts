import type ExcelJS from "exceljs";
import { parseImportDate, parseImportNumber } from "./normalize-import";

export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[*]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function cellToString(value: ExcelJS.CellValue): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "object") {
    if ("text" in value && value.text != null) return String(value.text).trim();
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("result" in value && value.result != null) return cellToString(value.result as ExcelJS.CellValue);
    if ("formula" in value && value.result != null) return cellToString(value.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

export function cellToNumber(value: ExcelJS.CellValue): number | undefined {
  return parseImportNumber(value);
}

export function pickCellRaw(
  row: ExcelJS.Row,
  headerIndex: Map<string, number>,
  ...aliases: string[]
): ExcelJS.CellValue | undefined {
  for (const alias of aliases) {
    const idx = headerIndex.get(normalizeHeader(alias));
    if (idx == null) continue;
    const value = row.getCell(idx + 1).value;
    if (value != null && value !== "") return value;
  }
  return undefined;
}

export function pickCellDate(
  row: ExcelJS.Row,
  headerIndex: Map<string, number>,
  ...aliases: string[]
): string | undefined {
  const raw = pickCellRaw(row, headerIndex, ...aliases);
  if (raw == null) return undefined;
  return parseImportDate(raw);
}

export function buildHeaderIndex(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    const key = normalizeHeader(header);
    if (key && !map.has(key)) map.set(key, index);
  });
  return map;
}

export function pickCell(
  row: ExcelJS.Row,
  headerIndex: Map<string, number>,
  ...aliases: string[]
): string {
  for (const alias of aliases) {
    const idx = headerIndex.get(normalizeHeader(alias));
    if (idx == null) continue;
    const value = cellToString(row.getCell(idx + 1).value);
    if (value) return value;
  }
  return "";
}

export function pickCellNumber(
  row: ExcelJS.Row,
  headerIndex: Map<string, number>,
  ...aliases: string[]
): number | undefined {
  for (const alias of aliases) {
    const idx = headerIndex.get(normalizeHeader(alias));
    if (idx == null) continue;
    const value = cellToNumber(row.getCell(idx + 1).value);
    if (value != null) return value;
  }
  return undefined;
}
