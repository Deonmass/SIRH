import type { DbDepartementRow } from "../../../../database/migrations/002_departements.types";
import type { Departement } from "@/lib/types";

export function departementIdToApp(id: number): string {
  return String(id);
}

export function departementIdFromApp(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Identifiant de département invalide : ${id}`);
  }
  return n;
}

export function rowToDepartement(row: DbDepartementRow): Departement {
  return {
    id: departementIdToApp(row.id),
    code: row.code,
    libelle: row.libelle,
    ordre: row.ordre,
    actif: row.actif,
    description: row.description,
    createdAt: row.cree_le,
    updatedAt: row.modif_le,
  };
}

export function departementToRow(
  departement: Pick<Departement, "code" | "libelle" | "ordre" | "actif" | "description">
): Omit<DbDepartementRow, "id" | "cree_le" | "modif_le" | "cree_par" | "modif_par"> {
  return {
    code: departement.code,
    libelle: departement.libelle,
    ordre: departement.ordre,
    actif: departement.actif,
    description: departement.description ?? "",
  };
}

export function departementLabels(departements: Departement[], activeOnly = true): string[] {
  return departements
    .filter((d) => !activeOnly || d.actif)
    .sort((a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle, "fr"))
    .map((d) => d.libelle);
}

export function suggestUniqueLibelle(libelle: string, existingLibelles: Set<string>): string {
  const base = libelle.trim() || "Nouveau département";
  const normalized = (s: string) => s.trim().toLowerCase();
  if (!existingLibelles.has(normalized(base))) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base} ${i}`;
    if (!existingLibelles.has(normalized(candidate))) return candidate;
  }
  return `${base} ${Date.now().toString(36)}`;
}

export function suggestDepartementCode(libelle: string, existingCodes: Set<string>): string {
  const words = libelle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  let base =
    words.length >= 2
      ? words
          .slice(0, 3)
          .map((w) => w[0] ?? "")
          .join("")
          .toUpperCase()
      : (words[0]?.slice(0, 3) ?? "DEP").toUpperCase();
  if (base.length < 2) base = "DEP";
  if (!existingCodes.has(base)) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}${i}`;
    if (!existingCodes.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}
