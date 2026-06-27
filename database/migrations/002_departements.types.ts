/**
 * Migration 002 — DEPARTEMENTS
 *
 * Colonnes en français court · sans FK · liaison postes.dept par libelle ou code.
 */

/** Ligne table `departements` */
export interface DbDepartementRow {
  id: number;
  code: string;
  libelle: string;
  ordre: number;
  actif: boolean;
  description: string;
  cree_le: string;
  cree_par: string | null;
  modif_le: string;
  modif_par: string | null;
}

/** Correspondance colonnes ↔ app actuelle (settings.departments[]) */
export const DEPARTEMENTS_COLUMN_MAP = {
  code: "code (référence courte)",
  libelle: "settings.departments[] (nom affiché)",
  ordre: "ordre d'affichage",
  actif: "visible dans les listes",
  description: "notes internes",
  cree_le: "createdAt",
  modif_le: "updatedAt",
} as const;

export const MIGRATION_002_DEPARTEMENTS = {
  version: "002",
  name: "departements",
  tables: ["departements"] as const,
  foreignKeys: false,
  linkToPostes: "postes.dept → libelle ou code (TEXT)",
  status: "connected" as const,
};
