import type { DbCentreDesCoutsRow } from "../../../../database/migrations/028_centre_des_couts.types";
import type { CentreDesCouts } from "@/lib/types";

export function centreDesCoutsIdToApp(id: number): string {
  return String(id);
}

export function centreDesCoutsIdFromApp(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Identifiant centre de coûts invalide : ${id}`);
  }
  return n;
}

export function rowToCentreDesCouts(row: DbCentreDesCoutsRow): CentreDesCouts {
  return {
    id: centreDesCoutsIdToApp(row.id),
    denommination: row.denommination ?? "",
    autreInfo: row.autre_info ?? "",
    text: row.text ?? "",
  };
}

export function centreDesCoutsToRow(
  item: Omit<CentreDesCouts, "id"> & { id?: string }
): Omit<DbCentreDesCoutsRow, "id"> {
  return {
    denommination: item.denommination?.trim() || null,
    autre_info: item.autreInfo?.trim() || null,
    text: item.text?.trim() || null,
  };
}
