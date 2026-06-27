import type { DbVehiculeRow } from "../../../database/migrations/035_vehicules.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import {
  readDeclarationFields,
  writeDeclarationFields,
} from "./vehicules-db-columns";
import {
  appendVehiculePanneEvent,
  parseVehiculePannes,
  serializeVehiculePannes,
  type VehiculePanneEvent,
} from "@/lib/vehicule-pannes";
import {
  parseVehiculeEntretien,
  serializeVehiculeEntretien,
  type VehiculeEntretienData,
} from "@/lib/vehicule-entretien";
import {
  clearVehiculePannesConfig,
  loadVehiculePannesMap,
  mergeVehiculePannes,
  rawPannesFromRow,
  resolvePannesColumnMode,
  saveVehiculePannes,
} from "./vehicule-pannes.store";

type VehiculeRow = DbVehiculeRow & {
  pannes?: unknown;
  panne?: unknown;
  kilometrage_initiale?: number | null;
  entretien?: string | null;
} & Record<string, unknown>;

export interface Vehicule {
  id: string;
  marque: string;
  vehicleType?: string;
  numeroChassis?: string;
  plaque?: string;
  province?: string;
  miseCirculation?: string;
  cv?: number;
  centreDeCout?: string;
  assureur?: string;
  departement?: string;
  utilisateur?: string;
  societeProprietaire?: string;
  statut?: string;
  kilometrageInitiale?: number;
  entretien?: VehiculeEntretienData;
  pannes: VehiculePanneEvent[];
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export type VehiculeInput = Omit<
  Vehicule,
  "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "pannes" | "entretien"
> & { pannes?: VehiculePanneEvent[]; entretien?: VehiculeEntretienData };

const TABLE = "vehicules";

function client() {
  return createSupabaseAdminAnonClient();
}

function missingTable(error: { message: string; code?: string }) {
  return (
    error.code === "PGRST205" ||
    error.message.includes("Could not find the table") ||
    error.message.includes("schema cache")
  );
}

function rowToVehicule(
  row: VehiculeRow,
  pannesMap: Map<string, VehiculePanneEvent[]>
): Vehicule {
  const id = String(row.id);
  const declaration = readDeclarationFields(row);
  return {
    id,
    marque: row.marque,
    vehicleType: row.vehicle_type ?? undefined,
    numeroChassis: row.numero_chassis ?? undefined,
    plaque: row.plaque ?? undefined,
    province: row.province ?? undefined,
    miseCirculation: row.mise_circulation ?? undefined,
    cv: row.cv ?? undefined,
    centreDeCout: row.centre_de_cout ?? undefined,
    ...declaration,
    kilometrageInitiale: row.kilometrage_initiale ?? undefined,
    entretien: parseVehiculeEntretien(row.entretien) ?? undefined,
    pannes: mergeVehiculePannes(id, rawPannesFromRow(row), pannesMap),
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? undefined,
  };
}

function inputToRow(input: VehiculeInput) {
  const row: Record<string, unknown> = {
    marque: input.marque.trim(),
    vehicle_type: input.vehicleType?.trim() || null,
    numero_chassis: input.numeroChassis?.trim() || null,
    plaque: input.plaque?.trim() || null,
    province: input.province?.trim() || null,
    mise_circulation: input.miseCirculation || null,
    cv: input.cv ?? null,
    centre_de_cout: input.centreDeCout?.trim() || null,
    ...writeDeclarationFields({
      assureur: input.assureur,
      departement: input.departement,
      utilisateur: input.utilisateur,
      societeProprietaire: input.societeProprietaire,
      statut: input.statut,
    }),
  };
  if (input.kilometrageInitiale != null) {
    row.kilometrage_initiale = input.kilometrageInitiale;
  }
  if (input.entretien) {
    row.entretien = serializeVehiculeEntretien(input.entretien);
  }
  return row;
}

async function probePannesColumn(column: "pannes" | "panne") {
  const { error } = await client().from(TABLE).select(column).limit(1);
  return { error };
}

async function persistPannes(vehiculeId: string, events: VehiculePanneEvent[]): Promise<void> {
  const mode = await resolvePannesColumnMode(probePannesColumn);
  const updatedAt = new Date().toISOString();

  if (mode === "pannes_jsonb") {
    const { error } = await client()
      .from(TABLE)
      .update({
        pannes: JSON.parse(serializeVehiculePannes(events)),
        updated_at: updatedAt,
      })
      .eq("id", Number(vehiculeId));
    if (error) throw new Error(`vehicules.pannes: ${error.message}`);
    await clearVehiculePannesConfig(vehiculeId);
    return;
  }

  if (mode === "panne_text") {
    const { error } = await client()
      .from(TABLE)
      .update({
        panne: events.length === 0 ? null : serializeVehiculePannes(events),
        updated_at: updatedAt,
      })
      .eq("id", Number(vehiculeId));
    if (error) throw new Error(`vehicules.panne: ${error.message}`);
    await clearVehiculePannesConfig(vehiculeId);
    return;
  }

  await saveVehiculePannes(vehiculeId, events);
}

async function syncLegacyConfigPannesToColumn(
  rows: VehiculeRow[],
  pannesMap: Map<string, VehiculePanneEvent[]>
): Promise<void> {
  if (pannesMap.size === 0) return;
  const mode = await resolvePannesColumnMode(probePannesColumn);
  if (mode === "configuration") return;

  for (const row of rows) {
    const id = String(row.id);
    const configEvents = pannesMap.get(id);
    if (!configEvents?.length) continue;
    if (parseVehiculePannes(rawPannesFromRow(row)).length > 0) continue;
    await persistPannes(id, configEvents);
  }
}

export async function listVehicules(): Promise<Vehicule[]> {
  const pannesMap = await loadVehiculePannesMap();
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    if (missingTable(error)) return [];
    throw new Error(`vehicules.select: ${error.message}`);
  }
  const rows = (data ?? []) as VehiculeRow[];
  await syncLegacyConfigPannesToColumn(rows, pannesMap);
  const refreshedMap = await loadVehiculePannesMap();
  return rows.map((row) => rowToVehicule(row, refreshedMap));
}

export async function getVehiculeById(id: string): Promise<Vehicule | null> {
  const pannesMap = await loadVehiculePannesMap();
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("id", Number(id))
    .maybeSingle();
  if (error) throw new Error(`vehicules.get: ${error.message}`);
  if (!data) return null;
  return rowToVehicule(data as VehiculeRow, pannesMap);
}

export async function createVehicule(input: VehiculeInput): Promise<Vehicule> {
  const { data, error } = await client()
    .from(TABLE)
    .insert(inputToRow(input))
    .select("*")
    .single();
  if (error) throw new Error(`vehicules.insert: ${error.message}`);
  const pannesMap = await loadVehiculePannesMap();
  return rowToVehicule(data as VehiculeRow, pannesMap);
}

export async function updateVehicule(item: Vehicule): Promise<Vehicule> {
  const row: Record<string, unknown> = {
    ...inputToRow(item),
    updated_at: new Date().toISOString(),
  };
  if (item.entretien) {
    row.entretien = serializeVehiculeEntretien(item.entretien);
  }
  const { data, error } = await client()
    .from(TABLE)
    .update(row)
    .eq("id", Number(item.id))
    .select("*")
    .single();
  if (error) throw new Error(`vehicules.update: ${error.message}`);
  const pannesMap = await loadVehiculePannesMap();
  return { ...rowToVehicule(data as VehiculeRow, pannesMap), pannes: item.pannes };
}

async function appendPanneRecord(
  id: string,
  event: VehiculePanneEvent
): Promise<Vehicule> {
  const existing = await getVehiculeById(id);
  if (!existing) throw new Error("Véhicule introuvable");
  const pannes = appendVehiculePanneEvent(existing.pannes, event);
  await persistPannes(id, pannes);
  return { ...existing, pannes, updatedAt: new Date().toISOString() };
}

export async function declareVehiculePanne(
  id: string,
  description: string,
  at?: string
): Promise<Vehicule> {
  const existing = await getVehiculeById(id);
  if (!existing) throw new Error("Véhicule introuvable");
  const last = existing.pannes.at(-1);
  if (last?.type === "panne") {
    throw new Error("Ce véhicule est déjà déclaré en panne.");
  }
  return appendPanneRecord(id, {
    type: "panne",
    description: description.trim(),
    at: at ?? new Date().toISOString(),
  });
}

export async function remettreVehiculeEnService(
  id: string,
  description: string,
  at?: string
): Promise<Vehicule> {
  const existing = await getVehiculeById(id);
  if (!existing) throw new Error("Véhicule introuvable");
  const last = existing.pannes.at(-1);
  if (!last || last.type !== "panne") {
    throw new Error("Ce véhicule n'est pas en panne.");
  }
  return appendPanneRecord(id, {
    type: "remise_service",
    description: description.trim(),
    at: at ?? new Date().toISOString(),
  });
}

export async function deleteVehicule(id: string): Promise<boolean> {
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", Number(id))
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`vehicules.delete: ${error.message}`);
  if (data) {
    await saveVehiculePannes(id, []);
  }
  return Boolean(data);
}
