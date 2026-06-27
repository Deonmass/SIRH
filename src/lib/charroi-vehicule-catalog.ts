/** Marques courantes au parc automobile (RDC). */
export const VEHICULE_MARQUES_CATALOG = [
  "Toyota",
  "Mercedes-Benz",
  "Nissan",
  "Mitsubishi",
  "Honda",
  "Suzuki",
  "Hyundai",
  "Kia",
  "Peugeot",
  "Renault",
  "Ford",
  "Chevrolet",
  "Isuzu",
  "Land Rover",
  "Volkswagen",
  "BMW",
  "MAZ",
  "JAC",
  "Foton",
  "Sinotruk",
];

/** Modèles / types par marque (suggestions au formulaire). */
export const VEHICULE_TYPES_BY_MARQUE: Record<string, string[]> = {
  Toyota: [
    "Hiace",
    "Hilux",
    "Land Cruiser",
    "Prado",
    "RAV4",
    "Rush",
    "Ist",
    "Corolla",
    "Avanza",
    "Fortuner",
    "Yaris",
    "Camry",
    "Coaster",
  ],
  "Mercedes-Benz": [
    "Sprinter",
    "Vito",
    "Classe C",
    "Classe E",
    "Actros",
    "Atego",
    "Unimog",
  ],
  Nissan: ["Patrol", "Navara", "Hardbody", "NP300", "X-Trail", "Urvan"],
  Mitsubishi: ["Pajero", "L200", "Canter", "Outlander", "L300"],
  Honda: ["CR-V", "Civic", "Accord", "Fit"],
  Suzuki: ["Vitara", "Jimny", "Swift", "Carry"],
  Hyundai: ["H1", "Tucson", "Santa Fe", "HD65", "HD78"],
  Kia: ["Sportage", "Sorento", "K2700"],
  Peugeot: ["301", "508", "Partner", "Boxer"],
  Renault: ["Duster", "Kangoo", "Master"],
  Ford: ["Ranger", "Everest", "Transit"],
  Chevrolet: ["Captiva", "Trailblazer"],
  Isuzu: ["D-Max", "NPR", "FVR"],
  "Land Rover": ["Defender", "Discovery", "Range Rover"],
  Volkswagen: ["Amarok", "Transporter", "Tiguan"],
  BMW: ["Série 3", "Série 5", "X5"],
  MAZ: ["537", "6312"],
  JAC: ["N56", "N75"],
  Foton: ["Aumark", "View"],
  Sinotruk: ["Howo"],
};

/** Types génériques si la marque n'est pas reconnue. */
export const VEHICULE_TYPES_GENERIC = [
  "Berline",
  "Pick-up",
  "SUV",
  "4x4",
  "Minibus",
  "Bus",
  "Camionnette",
  "Camion",
  "Moto",
  "Utilitaire",
];

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function vehiculeTypesForMarque(marque: string): string[] {
  const key = marque.trim();
  if (!key) return [];
  if (VEHICULE_TYPES_BY_MARQUE[key]) return VEHICULE_TYPES_BY_MARQUE[key];
  const match = Object.entries(VEHICULE_TYPES_BY_MARQUE).find(
    ([brand]) => normalizeKey(brand) === normalizeKey(key)
  );
  return match ? match[1] : [];
}

export function mergeUniqueSorted(...lists: string[][]): string[] {
  return Array.from(
    new Set(
      lists
        .flat()
        .map((v) => (v == null ? "" : String(v).trim()))
        .filter((v) => v !== "")
    )
  ).sort((a, b) => a.localeCompare(b, "fr"));
}
