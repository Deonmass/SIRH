/**
 * Noms de colonnes PostgreSQL réels (table vehicules Supabase).
 * Identifiants quotés : ASSUREUR, DEPARTEMENT, societe proprietaire.
 */
export const VEHICULE_DB_COLUMNS = {
  ASSUREUR: "ASSUREUR",
  DEPARTEMENT: "DEPARTEMENT",
  UTILISATEUR: "utilisateur",
  SOCIETE_PROPRIETAIRE: "societe proprietaire",
  STATUT: "statut",
} as const;

export type VehiculeDbRowExtras = {
  ASSUREUR?: string | null;
  DEPARTEMENT?: string | null;
  utilisateur?: string | null;
  "societe proprietaire"?: string | null;
  statut?: string | null;
};

export function readDeclarationFields(row: Record<string, unknown>): {
  assureur?: string;
  departement?: string;
  utilisateur?: string;
  societeProprietaire?: string;
  statut?: string;
} {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

  return {
    assureur:
      str(row[VEHICULE_DB_COLUMNS.ASSUREUR]) ??
      str(row.assureur),
    departement:
      str(row[VEHICULE_DB_COLUMNS.DEPARTEMENT]) ??
      str(row.departement),
    utilisateur: str(row[VEHICULE_DB_COLUMNS.UTILISATEUR]),
    societeProprietaire:
      str(row[VEHICULE_DB_COLUMNS.SOCIETE_PROPRIETAIRE]) ??
      str(row.societe_proprietaire),
    statut: str(row[VEHICULE_DB_COLUMNS.STATUT]),
  };
}

export function writeDeclarationFields(input: {
  assureur?: string;
  departement?: string;
  utilisateur?: string;
  societeProprietaire?: string;
  statut?: string;
}): Record<string, string | null> {
  return {
    [VEHICULE_DB_COLUMNS.ASSUREUR]: input.assureur?.trim() || null,
    [VEHICULE_DB_COLUMNS.DEPARTEMENT]: input.departement?.trim() || null,
    [VEHICULE_DB_COLUMNS.UTILISATEUR]: input.utilisateur?.trim() || null,
    [VEHICULE_DB_COLUMNS.SOCIETE_PROPRIETAIRE]: input.societeProprietaire?.trim() || null,
    [VEHICULE_DB_COLUMNS.STATUT]: input.statut?.trim() || null,
  };
}
