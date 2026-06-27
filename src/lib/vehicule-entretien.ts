import {
  DEFAULT_ALERTE_AVANT_KM,
  DEFAULT_INTERVALLE_ENTRETIEN_KM,
  formatEntretienTypes,
  type EntretienHistoriqueEntry,
} from "@/lib/charroi-entretien";

export interface VehiculeEntretienData {
  intervalleKm: number;
  alerteAvantKm: number;
  dernierEntretienKm?: number;
  dernierEntretienDate?: string;
  historique: EntretienHistoriqueEntry[];
}

export const EMPTY_VEHICULE_ENTRETIEN: VehiculeEntretienData = {
  intervalleKm: DEFAULT_INTERVALLE_ENTRETIEN_KM,
  alerteAvantKm: DEFAULT_ALERTE_AVANT_KM,
  historique: [],
};

function parseHistorique(raw: unknown): EntretienHistoriqueEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, unknown> => e != null && typeof e === "object")
    .map((e, idx) => {
      const types = Array.isArray(e.types)
        ? e.types.map((t) => String(t).trim()).filter(Boolean)
        : typeof e.type === "string" && e.type.trim()
          ? [e.type.trim()]
          : [];
      return {
        id: String(e.id ?? `hist-${idx}`),
        date: String(e.date ?? ""),
        types: types.length > 0 ? types : undefined,
        type: types.length > 0 ? formatEntretienTypes(types) : String(e.type ?? "Entretien"),
        kmOdometre: typeof e.kmOdometre === "number" ? e.kmOdometre : undefined,
        kmParcourusDepuis:
          typeof e.kmParcourusDepuis === "number" ? e.kmParcourusDepuis : undefined,
        cout: typeof e.cout === "number" ? e.cout : undefined,
        prestataire: typeof e.prestataire === "string" ? e.prestataire : undefined,
        notes: typeof e.notes === "string" ? e.notes : undefined,
      };
    })
    .filter((e) => e.date);
}

export function parseVehiculeEntretien(raw: unknown): VehiculeEntretienData | null {
  if (raw == null || raw === "") return null;

  let obj: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      obj = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof raw === "object" && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>;
  } else {
    return null;
  }

  return {
    intervalleKm:
      typeof obj.intervalleKm === "number" && obj.intervalleKm > 0
        ? obj.intervalleKm
        : DEFAULT_INTERVALLE_ENTRETIEN_KM,
    alerteAvantKm:
      typeof obj.alerteAvantKm === "number" && obj.alerteAvantKm >= 0
        ? obj.alerteAvantKm
        : DEFAULT_ALERTE_AVANT_KM,
    dernierEntretienKm:
      typeof obj.dernierEntretienKm === "number" ? obj.dernierEntretienKm : undefined,
    dernierEntretienDate:
      typeof obj.dernierEntretienDate === "string" ? obj.dernierEntretienDate : undefined,
    historique: parseHistorique(obj.historique),
  };
}

export function serializeVehiculeEntretien(data: VehiculeEntretienData): string {
  return JSON.stringify(data);
}

export function mergeEntretienData(
  column: unknown,
  fallback?: VehiculeEntretienData | null
): VehiculeEntretienData {
  const fromColumn = parseVehiculeEntretien(column);
  if (fromColumn) return fromColumn;
  if (fallback) return fallback;
  return { ...EMPTY_VEHICULE_ENTRETIEN, historique: [] };
}
