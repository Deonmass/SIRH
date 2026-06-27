import ExcelJS from "exceljs";
import { STATUT_TECHNIQUE_OPTIONS } from "@/lib/charroi-vehicule-declaration";
import {
  createVehicule,
  type VehiculeInput,
} from "@/lib/repositories/vehicules/vehicules.repository";
import { parseVehiculesWorkbook } from "./parse-vehicule-workbook";
import type { ImportRowResult } from "./types";
import {
  VEHICULE_IMPORT_HEADERS,
  type VehiculeImportRow,
} from "./vehicule-import.types";

export type { VehiculeImportRow } from "./vehicule-import.types";
export { parseVehiculesWorkbook } from "./parse-vehicule-workbook";
export { vehiculeTemplateFilename } from "./vehicule-import.types";

export function vehiculeImportRowToInput(row: VehiculeImportRow): VehiculeInput {
  return {
    marque: row.marque,
    vehicleType: row.vehicleType,
    numeroChassis: row.numeroChassis,
    plaque: row.plaque,
    province: row.province,
    miseCirculation: row.miseCirculation,
    cv: row.cv,
    assureur: row.assureur,
    departement: row.departement,
    utilisateur: row.utilisateur,
    societeProprietaire: row.societeProprietaire,
    statut: row.statut,
    kilometrageInitiale: row.kilometrageInitiale,
  };
}

export async function importVehiculeRow(row: VehiculeImportRow): Promise<ImportRowResult> {
  const label = [row.plaque, row.marque, row.vehicleType].filter(Boolean).join(" · ") || row.marque;
  try {
    const created = await createVehicule(vehiculeImportRowToInput(row));
    return { line: row.line, ok: true, label, id: created.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import impossible";
    return { line: row.line, ok: false, label, error: message };
  }
}

export async function importVehiculesFromBuffer(buffer: ArrayBuffer) {
  const rows = await parseVehiculesWorkbook(buffer);
  const results = [];
  for (const row of rows) {
    results.push(await importVehiculeRow(row));
  }
  const success = results.filter((r) => r.ok).length;
  return {
    total: rows.length,
    success,
    failed: rows.length - success,
    results,
  };
}

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

export async function buildVehiculeImportTemplate(): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Charroi automobile";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Véhicules");
  sheet.addRow([...VEHICULE_IMPORT_HEADERS]);
  const header = sheet.getRow(1);
  header.height = 24;
  VEHICULE_IMPORT_HEADERS.forEach((_, i) => {
    const cell = header.getCell(i + 1);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    sheet.getColumn(i + 1).width = i === 14 ? 22 : i === 3 || i === 8 ? 18 : 14;
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  sheet.addRow([
    "1",
    "Toyota",
    "Pick up",
    "AHTFK8CD600320444",
    "4625AW01",
    "13 CV",
    "Sfa",
    "Sales",
    "Jean Pierre B",
    "Kinshasa",
    "PPC",
    "124580",
    "2016",
    "10",
    "Avertissement",
  ]);

  const instructions = workbook.addWorksheet("Instructions");
  const lines = [
    "Import parc véhicules — modèle Charroi",
    "",
    "Remplir la feuille « Véhicules » à partir de la ligne 2.",
    "MARQUE* obligatoire. PLAQUE ou N°CHASSIS recommandés (unicité).",
    `OBSERVATION TECH : ${STATUT_TECHNIQUE_OPTIONS.join(", ")}.`,
    "Km/H = kilométrage compteur. MISE CIRCULATION = année (ex. 2016).",
    "La ligne d'exemple peut être supprimée avant import.",
  ];
  lines.forEach((line, i) => {
    const row = instructions.addRow([line]);
    if (i === 0) row.getCell(1).font = { bold: true, size: 13 };
  });
  instructions.getColumn(1).width = 88;

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
