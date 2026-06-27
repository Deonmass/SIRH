/** Ré-exports client-safe — ne pas importer le service serveur depuis les Client Components. */
export type { VehiculeImportRow } from "./vehicule-import.types";
export { VEHICULE_IMPORT_HEADERS, vehiculeTemplateFilename } from "./vehicule-import.types";
export { parseVehiculesSheet, parseVehiculesWorkbook } from "./parse-vehicule-workbook";
