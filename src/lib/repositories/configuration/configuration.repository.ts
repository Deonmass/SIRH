import type { DbConfigurationRow } from "../../../../database/migrations/022_configuration.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";

const TABLE = "configuration";

function client() {
  return createSupabaseAdminAnonClient();
}

export async function listConfigurations(): Promise<DbConfigurationRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("titre_config", { ascending: true });
  if (error) throw new Error(`configuration.select: ${error.message}`);
  return (data ?? []) as DbConfigurationRow[];
}

export async function getConfigurationByTitre(
  titreConfig: string
): Promise<DbConfigurationRow | null> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("titre_config", titreConfig)
    .maybeSingle();
  if (error) throw new Error(`configuration.get: ${error.message}`);
  return (data as DbConfigurationRow | null) ?? null;
}

/** Insert ou mise à jour par `titre_config` (upsert). */
export async function upsertConfiguration(
  titreConfig: string,
  params: Record<string, unknown>,
  updatedBy?: string | null
): Promise<DbConfigurationRow> {
  const existing = await getConfigurationByTitre(titreConfig);
  const payload = {
    titre_config: titreConfig,
    params,
    updated_by: updatedBy ?? null,
  };

  if (existing) {
    const { data, error } = await client()
      .from(TABLE)
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(`configuration.update: ${error.message}`);
    return data as DbConfigurationRow;
  }

  const { data, error } = await client().from(TABLE).insert(payload).select("*").single();
  if (error) throw new Error(`configuration.insert: ${error.message}`);
  return data as DbConfigurationRow;
}
