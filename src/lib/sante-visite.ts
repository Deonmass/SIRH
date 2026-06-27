export type SanteVisiteValidation = "en_attente" | "valide" | "rejete";

export const SANTE_VISITE_VALIDATION_LABELS: Record<SanteVisiteValidation, string> = {
  en_attente: "En attente",
  valide: "Validé",
  rejete: "Rejeté",
};

export interface SanteVisiteFichier {
  name: string;
  ref: string;
  size?: number;
  mimeType?: string;
}

/** JSON enregistré dans `hopital_visite.validation`. */
export interface SanteVisiteValidationRecord {
  statut: SanteVisiteValidation;
  /** Date/heure de validation (statut = valide). */
  dateValidation?: string;
  /** Date/heure de rejet (statut = rejete). */
  dateRejet?: string;
  nomValidateur?: string;
  matriculeValidateur?: string;
  raisonRejet?: string;
}

export function getSanteVisiteStatutDate(record: SanteVisiteValidationRecord): string | undefined {
  if (record.statut === "rejete") return record.dateRejet ?? record.dateValidation;
  if (record.statut === "valide") return record.dateValidation;
  return undefined;
}

export function getSanteVisiteStatutDateLabel(statut: SanteVisiteValidation): string {
  if (statut === "rejete") return "Date de rejet";
  if (statut === "valide") return "Date de validation";
  return "Date";
}

export function formatSanteVisiteStatutDate(iso?: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function parseSanteVisiteValidation(raw: unknown): SanteVisiteValidationRecord {
  if (raw == null || raw === "") return { statut: "en_attente" };

  if (typeof raw === "object" && raw !== null && "statut" in raw) {
    const record = raw as SanteVisiteValidationRecord;
    return {
      statut: normalizeSanteValidationStatut(record.statut),
      dateValidation: record.dateValidation,
      dateRejet: record.dateRejet,
      nomValidateur: record.nomValidateur,
      matriculeValidateur: record.matriculeValidateur,
      raisonRejet: record.raisonRejet,
    };
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && "statut" in parsed) {
        return parseSanteVisiteValidation(parsed);
      }
    } catch {
      // legacy plain text
    }
    return { statut: normalizeSanteValidationStatut(raw) };
  }

  return { statut: "en_attente" };
}

export function serializeSanteVisiteValidation(record: SanteVisiteValidationRecord): string {
  return JSON.stringify(record);
}

export function getSanteVisiteStatut(raw: unknown): SanteVisiteValidation {
  return parseSanteVisiteValidation(raw).statut;
}

export function normalizeSanteValidationStatut(value?: unknown): SanteVisiteValidation {
  if (value === "valide" || value === "rejete" || value === "en_attente") return value;
  return "en_attente";
}

/** @deprecated Préférer getSanteVisiteStatut — compatibilité ascendante. */
export function normalizeSanteValidation(value?: unknown): SanteVisiteValidation {
  return getSanteVisiteStatut(value);
}

export function buildSanteVisiteValidationRecord(input: {
  statut: SanteVisiteValidation;
  nomValidateur: string;
  matriculeValidateur?: string | null;
  raisonRejet?: string;
}): SanteVisiteValidationRecord {
  if (input.statut === "en_attente") {
    return { statut: "en_attente" };
  }

  const now = new Date().toISOString();
  const base = {
    statut: input.statut,
    nomValidateur: input.nomValidateur,
    matriculeValidateur: input.matriculeValidateur ?? undefined,
  };

  if (input.statut === "rejete") {
    return {
      ...base,
      dateRejet: now,
      raisonRejet: input.raisonRejet?.trim(),
    };
  }

  return {
    ...base,
    dateValidation: now,
  };
}

export function parseSanteVisiteFichiers(raw: unknown): SanteVisiteFichier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is SanteVisiteFichier => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as SanteVisiteFichier).name === "string" &&
        typeof (item as SanteVisiteFichier).ref === "string"
      );
    })
    .map((item) => ({
      name: item.name,
      ref: item.ref,
      size: item.size,
      mimeType: item.mimeType,
    }));
}
