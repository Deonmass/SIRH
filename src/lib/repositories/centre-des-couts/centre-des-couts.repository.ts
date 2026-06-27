import type { DbCentreDesCoutsRow } from "../../../../database/migrations/028_centre_des_couts.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import type { CentreDesCouts } from "@/lib/types";
import {
  centreDesCoutsIdFromApp,
  centreDesCoutsToRow,
  rowToCentreDesCouts,
} from "./mapper";

const TABLE = "centre_des_couts";

function client() {
  return createSupabaseAdminAnonClient();
}

async function selectAllRows(): Promise<DbCentreDesCoutsRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    if (
      error.message.includes("Could not find the table") ||
      error.message.includes("schema cache") ||
      error.code === "PGRST205"
    ) {
      return [];
    }
    throw new Error(`centre_des_couts.select: ${error.message}`);
  }
  return (data ?? []) as DbCentreDesCoutsRow[];
}

export async function listCentreDesCouts(): Promise<CentreDesCouts[]> {
  const rows = await selectAllRows();
  return rows.map(rowToCentreDesCouts);
}

export async function getCentreDesCoutsById(id: string): Promise<CentreDesCouts | null> {
  const numericId = centreDesCoutsIdFromApp(id);
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("id", numericId)
    .maybeSingle();
  if (error) throw new Error(`centre_des_couts.get: ${error.message}`);
  if (!data) return null;
  return rowToCentreDesCouts(data as DbCentreDesCoutsRow);
}

export async function createCentreDesCouts(
  partial: Omit<CentreDesCouts, "id">
): Promise<CentreDesCouts> {
  const { data, error } = await client()
    .from(TABLE)
    .insert(centreDesCoutsToRow(partial))
    .select("*")
    .single();
  if (error) {
    if (error.message.includes("Could not find the table")) {
      throw new Error(
        "Table centre_des_couts absente — exécutez database/migrations/028_centre_des_couts.sql"
      );
    }
    throw new Error(`centre_des_couts.insert: ${error.message}`);
  }
  return rowToCentreDesCouts(data as DbCentreDesCoutsRow);
}

export async function updateCentreDesCouts(item: CentreDesCouts): Promise<CentreDesCouts> {
  const numericId = centreDesCoutsIdFromApp(item.id);
  const { data, error } = await client()
    .from(TABLE)
    .update(centreDesCoutsToRow(item))
    .eq("id", numericId)
    .select("*")
    .single();
  if (error) throw new Error(`centre_des_couts.update: ${error.message}`);
  return rowToCentreDesCouts(data as DbCentreDesCoutsRow);
}

export async function deleteCentreDesCouts(id: string): Promise<boolean> {
  const numericId = centreDesCoutsIdFromApp(id);
  const { error: unlinkError } = await client()
    .from("postes")
    .update({ centre_des_couts: null })
    .eq("centre_des_couts", numericId);
  if (unlinkError) throw new Error(`centre_des_couts.unlink: ${unlinkError.message}`);

  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", numericId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`centre_des_couts.delete: ${error.message}`);
  return Boolean(data);
}
