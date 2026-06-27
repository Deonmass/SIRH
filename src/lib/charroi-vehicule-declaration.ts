import type { Vehicule } from "@/lib/repositories/vehicules";

export const STATUT_TECHNIQUE_OPTIONS = ["Bon état", "Avertissement", "A déclasser"] as const;
export type StatutTechnique = (typeof STATUT_TECHNIQUE_OPTIONS)[number];

export const KM_DECLASSEMENT_SEUIL = 180_000;

export const AGE_CRITERIA = [
  { id: "0-5", label: "0 – 5 ans", min: 0, max: 5 },
  { id: "5-10", label: "5 – 10 ans", min: 5, max: 10 },
  { id: "10+", label: "Au-delà de 10 ans", min: 10, max: Number.POSITIVE_INFINITY },
] as const;

export const KM_CRITERIA = [
  { id: "under", label: "0 – 180 000 km", max: KM_DECLASSEMENT_SEUIL },
  { id: "over", label: "Au-delà de 180 000 km", min: KM_DECLASSEMENT_SEUIL },
] as const;

export type StatutCountRow = {
  label: StatutTechnique | "Non renseigné";
  count: number;
};

export type AgeCriteriaMatrix = {
  label: string;
  bonEtat: number;
  avertissement: number;
  aDeclasser: number;
  nonRenseigne: number;
  total: number;
};

export type KmCriteriaMatrix = {
  label: string;
  bonEtat: number;
  aDeclasser: number;
  avertissement: number;
  nonRenseigne: number;
  total: number;
};

export type SocieteStatutBreakdown = {
  societe: string;
  bonEtat: number;
  avertissement: number;
  aDeclasser: number;
  total: number;
};

export type DeclarationDashboardStats = {
  total: number;
  parStatut: StatutCountRow[];
  parSociete: SocieteStatutBreakdown[];
  critereAge: AgeCriteriaMatrix[];
  critereKm: KmCriteriaMatrix[];
};

export function normalizeStatutTechnique(raw?: string | null): StatutTechnique | null {
  const v = raw?.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!v) return null;
  if (v.includes("bon") && v.includes("etat")) return "Bon état";
  if (v.includes("avert")) return "Avertissement";
  if (v.includes("declass")) return "A déclasser";
  return null;
}

export function vehiculeAgeYearsFromMiseCirculation(miseCirculation?: string): number | null {
  if (!miseCirculation) return null;
  const match = miseCirculation.match(/^(\d{4})/);
  if (!match) return null;
  const year = Number(match[1]);
  if (Number.isNaN(year)) return null;
  return Math.max(0, new Date().getFullYear() - year);
}

export function vehiculeKmValue(v: Vehicule): number | null {
  if (v.kilometrageInitiale != null && !Number.isNaN(v.kilometrageInitiale)) {
    return v.kilometrageInitiale;
  }
  return null;
}

function emptyStatutBucket() {
  return {
    "Bon état": 0,
    Avertissement: 0,
    "A déclasser": 0,
    "Non renseigné": 0,
  };
}

function bumpStatut(bucket: ReturnType<typeof emptyStatutBucket>, statut: StatutTechnique | null) {
  if (statut === "Bon état") bucket["Bon état"]++;
  else if (statut === "Avertissement") bucket.Avertissement++;
  else if (statut === "A déclasser") bucket["A déclasser"]++;
  else bucket["Non renseigné"]++;
}

export function buildDeclarationDashboardStats(vehicules: Vehicule[]): DeclarationDashboardStats {
  const parStatutBucket = emptyStatutBucket();
  const societeMap = new Map<string, ReturnType<typeof emptyStatutBucket>>();
  const ageMatrix = AGE_CRITERIA.map((c) => ({
    label: c.label,
    bonEtat: 0,
    avertissement: 0,
    aDeclasser: 0,
    nonRenseigne: 0,
    total: 0,
  }));
  const kmMatrix: KmCriteriaMatrix[] = [
    {
      label: KM_CRITERIA[0]!.label,
      bonEtat: 0,
      aDeclasser: 0,
      avertissement: 0,
      nonRenseigne: 0,
      total: 0,
    },
    {
      label: KM_CRITERIA[1]!.label,
      bonEtat: 0,
      aDeclasser: 0,
      avertissement: 0,
      nonRenseigne: 0,
      total: 0,
    },
  ];

  for (const v of vehicules) {
    const statut = normalizeStatutTechnique(v.statut);
    bumpStatut(parStatutBucket, statut);

    const societe = v.societeProprietaire?.trim() || "Non renseigné";
    const socBucket = societeMap.get(societe) ?? emptyStatutBucket();
    bumpStatut(socBucket, statut);
    societeMap.set(societe, socBucket);

    const age = vehiculeAgeYearsFromMiseCirculation(v.miseCirculation);
    if (age != null) {
      const ageRow =
        age < 5
          ? ageMatrix[0]
          : age < 10
            ? ageMatrix[1]
            : ageMatrix[2];
      if (ageRow) {
        ageRow.total++;
        if (statut === "Bon état") ageRow.bonEtat++;
        else if (statut === "Avertissement") ageRow.avertissement++;
        else if (statut === "A déclasser") ageRow.aDeclasser++;
        else ageRow.nonRenseigne++;
      }
    }

    const km = vehiculeKmValue(v);
    if (km != null) {
      const kmRow = km < KM_DECLASSEMENT_SEUIL ? kmMatrix[0]! : kmMatrix[1]!;
      kmRow.total++;
      if (statut === "Bon état") kmRow.bonEtat++;
      else if (statut === "A déclasser") kmRow.aDeclasser++;
      else if (statut === "Avertissement") kmRow.avertissement++;
      else kmRow.nonRenseigne++;
    }
  }

  return {
    total: vehicules.length,
    parStatut: (STATUT_TECHNIQUE_OPTIONS as readonly string[])
      .concat("Non renseigné")
      .map((label) => ({
        label: label as StatutCountRow["label"],
        count: parStatutBucket[label as keyof typeof parStatutBucket] ?? 0,
      }))
      .filter((r) => r.count > 0 || r.label !== "Non renseigné"),
    parSociete: [...societeMap.entries()]
      .map(([societe, bucket]) => ({
        societe,
        bonEtat: bucket["Bon état"],
        avertissement: bucket.Avertissement,
        aDeclasser: bucket["A déclasser"],
        total:
          bucket["Bon état"] + bucket.Avertissement + bucket["A déclasser"] + bucket["Non renseigné"],
      }))
      .sort((a, b) => b.total - a.total || a.societe.localeCompare(b.societe, "fr")),
    critereAge: ageMatrix,
    critereKm: kmMatrix,
  };
}

export function parseCvValue(raw?: string | number | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw);
  const match = String(raw).match(/(\d+)/);
  if (!match) return undefined;
  const n = Number(match[1]);
  return Number.isNaN(n) ? undefined : n;
}

export function parseKmValue(raw?: string | number | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw);
  const digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isNaN(n) ? undefined : n;
}

export function parseMiseCirculationYear(raw?: string | number | null): string | undefined {
  if (raw == null || raw === "") return undefined;
  if (typeof raw === "number" && raw >= 1900 && raw <= 2100) return `${Math.round(raw)}-01-01`;
  const match = String(raw).match(/(\d{4})/);
  if (!match) return undefined;
  return `${match[1]}-01-01`;
}
