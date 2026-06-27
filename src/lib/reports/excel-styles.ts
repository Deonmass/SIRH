import type ExcelJS from "exceljs";

export const EXCEL_COLORS = {
  headerBg: "FF0F172A",
  headerFg: "FFF8FAFC",
  accent: "FF0EA5E9",
  accentSoft: "FFE0F2FE",
  sectionBg: "FF1E293B",
  sectionFg: "FF38BDF8",
  totalBg: "FFF1F5F9",
  border: "FFCBD5E1",
  kpiBg: "FFF8FAFC",
} as const;

export function styleHeaderRow(sheet: ExcelJS.Worksheet, colCount: number, rowNumber = 1) {
  const row = sheet.getRow(rowNumber);
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: EXCEL_COLORS.accent },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "thin", color: { argb: EXCEL_COLORS.border } },
    };
  }
}

export function styleSectionTitle(cell: ExcelJS.Cell) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: EXCEL_COLORS.sectionBg },
  };
  cell.font = { bold: true, color: { argb: EXCEL_COLORS.sectionFg }, size: 11 };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

export function styleTotalRow(row: ExcelJS.Row, colCount: number) {
  row.font = { bold: true };
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: EXCEL_COLORS.totalBg },
    };
    row.getCell(c).border = {
      top: { style: "thin", color: { argb: EXCEL_COLORS.border } },
    };
  }
}

export function setNumberFormat(cell: ExcelJS.Cell, decimals = 0) {
  cell.numFmt = decimals > 0 ? `#,##0.${"0".repeat(decimals)}` : "#,##0";
}

export function setMoneyFormat(cell: ExcelJS.Cell) {
  cell.numFmt = '#,##0.00 " $US"';
}
