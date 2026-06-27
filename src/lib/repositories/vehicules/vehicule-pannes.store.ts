import { getConfigurationByTitre, upsertConfiguration } from "@/lib/repositories/configuration";
import {
  parseVehiculePannes,
  type VehiculePanneEvent,
} from "@/lib/vehicule-pannes";

const CONFIG_TITRE = "Charroi — pannes véhicules";

type PannesParams = {
  byId: Record<string, VehiculePanneEvent[]>;
};

function parseParams(raw: unknown): PannesParams {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { byId: {} };
  }
  const byId = (raw as PannesParams).byId;
  if (!byId || typeof byId !== "object") return { byId: {} };
  const out: Record<string, VehiculePanneEvent[]> = {};
  for (const [id, events] of Object.entries(byId)) {
    out[id] = parseVehiculePannes(events);
  }
  return { byId: out };
}

export async function loadVehiculePannesMap(): Promise<Map<string, VehiculePanneEvent[]>> {
  const row = await getConfigurationByTitre(CONFIG_TITRE);
  const params = parseParams(row?.params);
  return new Map(Object.entries(params.byId));
}

export async function saveVehiculePannes(
  vehiculeId: string,
  events: VehiculePanneEvent[]
): Promise<void> {
  const row = await getConfigurationByTitre(CONFIG_TITRE);
  const params = parseParams(row?.params);
  if (events.length === 0) {
    delete params.byId[vehiculeId];
  } else {
    params.byId[vehiculeId] = events;
  }
  await upsertConfiguration(CONFIG_TITRE, params as unknown as Record<string, unknown>);
}

export function mergeVehiculePannes(
  vehiculeId: string,
  fromColumn: unknown,
  fromStore: Map<string, VehiculePanneEvent[]>
): VehiculePanneEvent[] {
  const columnEvents = parseVehiculePannes(fromColumn);
  if (columnEvents.length > 0) return columnEvents;
  return fromStore.get(vehiculeId) ?? [];
}

export type PannesColumnMode = "pannes_jsonb" | "panne_text" | "configuration";

let cachedPannesColumnMode: PannesColumnMode | null = null;

export function resetPannesColumnModeCache(): void {
  cachedPannesColumnMode = null;
}

export async function resolvePannesColumnMode(
  probe: (column: "pannes" | "panne") => Promise<{ error: { message?: string } | null }>
): Promise<PannesColumnMode> {
  if (cachedPannesColumnMode) return cachedPannesColumnMode;

  const pannesProbe = await probe("pannes");
  if (!pannesProbe.error) {
    cachedPannesColumnMode = "pannes_jsonb";
    return cachedPannesColumnMode;
  }

  const panneProbe = await probe("panne");
  if (!panneProbe.error) {
    cachedPannesColumnMode = "panne_text";
    return cachedPannesColumnMode;
  }

  cachedPannesColumnMode = "configuration";
  return cachedPannesColumnMode;
}

/** Lit pannes (jsonb) ou panne (text JSON) depuis une ligne vehicules. */
export function rawPannesFromRow(row: { pannes?: unknown; panne?: unknown }): unknown {
  if (row.pannes != null && row.pannes !== "[]") return row.pannes;
  if (row.panne != null && String(row.panne).trim() !== "") return row.panne;
  return null;
}

export function isMissingPannesColumnError(error: { message?: string }): boolean {
  const msg = error.message ?? "";
  return (
    msg.includes("column vehicules.pannes does not exist") ||
    msg.includes("'pannes' column") ||
    msg.includes("Could not find the 'pannes'") ||
    msg.includes("schema cache")
  );
}

export async function clearVehiculePannesConfig(vehiculeId: string): Promise<void> {
  await saveVehiculePannes(vehiculeId, []);
}
