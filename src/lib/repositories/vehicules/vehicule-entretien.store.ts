import { getConfigurationByTitre, upsertConfiguration } from "@/lib/repositories/configuration";
import {
  DEFAULT_ALERTE_AVANT_KM,
  DEFAULT_INTERVALLE_ENTRETIEN_KM,
  formatEntretienTypes,
  type EntretienHistoriqueEntry,
  type EntretienVehiculeConfig,
} from "@/lib/charroi-entretien";
import {
  getVehiculeById,
  updateVehicule,
  type Vehicule,
} from "@/lib/repositories/vehicules/vehicules.repository";
import {
  mergeEntretienData,
  parseVehiculeEntretien,
  serializeVehiculeEntretien,
  type VehiculeEntretienData,
} from "@/lib/vehicule-entretien";

const CONFIG_TITRE = "Charroi — entretien véhicules";

export interface EntretienDefaults {
  intervalleKm: number;
  alerteAvantKm: number;
}

interface EntretienParams {
  defaults: EntretienDefaults;
  byId: Record<string, VehiculeEntretienData>;
}

function defaultParams(): EntretienParams {
  return {
    defaults: {
      intervalleKm: DEFAULT_INTERVALLE_ENTRETIEN_KM,
      alerteAvantKm: DEFAULT_ALERTE_AVANT_KM,
    },
    byId: {},
  };
}

function parseConfigParams(raw: unknown): EntretienParams {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaultParams();
  const obj = raw as Partial<EntretienParams>;
  const defaults = obj.defaults ?? defaultParams().defaults;
  const byId: Record<string, VehiculeEntretienData> = {};

  if (obj.byId && typeof obj.byId === "object") {
    for (const [id, value] of Object.entries(obj.byId)) {
      const parsed = parseVehiculeEntretien(value);
      if (parsed) byId[id] = parsed;
    }
  }

  return {
    defaults: {
      intervalleKm:
        typeof defaults.intervalleKm === "number" && defaults.intervalleKm > 0
          ? defaults.intervalleKm
          : DEFAULT_INTERVALLE_ENTRETIEN_KM,
      alerteAvantKm:
        typeof defaults.alerteAvantKm === "number" && defaults.alerteAvantKm >= 0
          ? defaults.alerteAvantKm
          : DEFAULT_ALERTE_AVANT_KM,
    },
    byId,
  };
}

async function loadConfigParams(): Promise<EntretienParams> {
  const row = await getConfigurationByTitre(CONFIG_TITRE);
  return parseConfigParams(row?.params);
}

function entretienToConfig(data: VehiculeEntretienData): EntretienVehiculeConfig {
  return {
    dernierEntretienKm: data.dernierEntretienKm,
    dernierEntretienDate: data.dernierEntretienDate,
    intervalleKm: data.intervalleKm,
    alerteAvantKm: data.alerteAvantKm,
  };
}

function resolveEntretienForVehicule(
  vehicule: Vehicule,
  configFallback?: VehiculeEntretienData | null
): VehiculeEntretienData {
  if (vehicule.entretien) return vehicule.entretien;
  return mergeEntretienData(null, configFallback);
}

export async function loadEntretienDefaults(): Promise<EntretienDefaults> {
  const params = await loadConfigParams();
  return params.defaults;
}

export async function getVehiculeEntretienFromStore(
  vehicule: Vehicule
): Promise<{ config: EntretienVehiculeConfig; historique: EntretienHistoriqueEntry[] }> {
  const params = await loadConfigParams();
  const data = resolveEntretienForVehicule(vehicule, params.byId[vehicule.id]);
  return {
    config: entretienToConfig(data),
    historique: data.historique,
  };
}

export async function loadAllEntretienFromVehicules(
  vehicules: Vehicule[]
): Promise<Map<string, { config: EntretienVehiculeConfig; historique: EntretienHistoriqueEntry[] }>> {
  const params = await loadConfigParams();
  const map = new Map<
    string,
    { config: EntretienVehiculeConfig; historique: EntretienHistoriqueEntry[] }
  >();

  for (const vehicule of vehicules) {
    const data = resolveEntretienForVehicule(vehicule, params.byId[vehicule.id]);
    map.set(vehicule.id, {
      config: entretienToConfig(data),
      historique: data.historique,
    });
  }

  return map;
}

async function persistEntretienOnVehicule(
  vehiculeId: string,
  data: VehiculeEntretienData
): Promise<Vehicule> {
  const existing = await getVehiculeById(vehiculeId);
  if (!existing) throw new Error("Véhicule introuvable");

  try {
    return await updateVehicule({
      ...existing,
      entretien: data,
    });
  } catch {
    const params = await loadConfigParams();
    params.byId[vehiculeId] = data;
    await upsertConfiguration(CONFIG_TITRE, params as unknown as Record<string, unknown>);
    return { ...existing, entretien: data };
  }
}

export async function recordVehiculeEntretien(input: {
  vehiculeId: string;
  date: string;
  type?: string;
  types?: string[];
  kmOdometre?: number;
  kmParcourusDepuis?: number;
  cout?: number;
  prestataire?: string;
  notes?: string;
  intervalleKm?: number;
  alerteAvantKm?: number;
}): Promise<{ config: EntretienVehiculeConfig; historique: EntretienHistoriqueEntry[] }> {
  const existing = await getVehiculeById(input.vehiculeId);
  if (!existing) throw new Error("Véhicule introuvable");

  const params = await loadConfigParams();
  const current = resolveEntretienForVehicule(existing, params.byId[input.vehiculeId]);

  const types =
    input.types?.map((t) => t.trim()).filter(Boolean) ??
    (input.type?.trim() ? [input.type.trim()] : []);
  if (types.length === 0) throw new Error("Au moins un type d'entretien requis");

  const entry: EntretienHistoriqueEntry = {
    id: `ent-${Date.now()}`,
    date: input.date,
    types,
    type: formatEntretienTypes(types),
    kmOdometre: input.kmOdometre,
    kmParcourusDepuis: input.kmParcourusDepuis,
    cout: input.cout,
    prestataire: input.prestataire,
    notes: input.notes,
  };

  const data: VehiculeEntretienData = {
    dernierEntretienKm: input.kmOdometre ?? current.dernierEntretienKm,
    dernierEntretienDate: input.date,
    intervalleKm: input.intervalleKm ?? current.intervalleKm,
    alerteAvantKm: input.alerteAvantKm ?? current.alerteAvantKm,
    historique: [entry, ...current.historique],
  };

  await persistEntretienOnVehicule(input.vehiculeId, data);
  return { config: entretienToConfig(data), historique: data.historique };
}

export async function updateVehiculeEntretienSeuils(
  vehiculeId: string,
  seuils: { intervalleKm?: number; alerteAvantKm?: number }
): Promise<EntretienVehiculeConfig> {
  const existing = await getVehiculeById(vehiculeId);
  if (!existing) throw new Error("Véhicule introuvable");

  const params = await loadConfigParams();
  const current = resolveEntretienForVehicule(existing, params.byId[vehiculeId]);

  const data: VehiculeEntretienData = {
    ...current,
    intervalleKm: seuils.intervalleKm ?? current.intervalleKm,
    alerteAvantKm: seuils.alerteAvantKm ?? current.alerteAvantKm,
  };

  await persistEntretienOnVehicule(vehiculeId, data);
  return entretienToConfig(data);
}

export { serializeVehiculeEntretien };
