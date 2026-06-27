import type { DbVehiculeRow as DbVehiculeRowBase } from "./035_vehicules.types";

export interface DbVehiculeRow extends DbVehiculeRowBase {
  pannes: unknown;
}
