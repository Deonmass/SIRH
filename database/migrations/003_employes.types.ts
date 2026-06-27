/**
 * Migration 003 — EMPLOYES
 *
 * Périmètre : onglets Profil + Coordonnées (+ audit).
 * Colonnes en français court · sans FK.
 */

import type { MaritalStatus, Sexe } from "@/lib/types";
import type { DbEmployeMouvementJson } from "./006_employes_mouvement.types";
import type { DbEmployeCoordonneesJson } from "./008_employes_coordonnees.types";
import type { DbEmployeDocumentJson } from "./009_employes_document.types";

/** Ligne table `employes` */
export interface DbEmployeRow {
  id: number;
  matricule: string;
  nom: string;
  post_nom: string | null;
  prenom: string;
  sexe: Sexe;
  date_naiss: string | null;
  lieu_naiss: string | null;
  nationalite: string;
  statut_mat: MaritalStatus;
  /** Statut RH — migration 007 */
  statut: string | null;
  adresse: string | null;
  email_pro: string | null;
  tel: string | null;
  mouvement: DbEmployeMouvementJson | null;
  coordonnees: DbEmployeCoordonneesJson | null;
  /** Checklist documents — migration 009 */
  document: DbEmployeDocumentJson | null;
  /** Solde congé JSON — migration 012 */
  solde_conge: string | null;
  /** Demandes et historique congés JSON — migration 014 */
  conges: string | null;
  /** Historique disciplinaire JSON — migration 018 */
  discipline?: string | null;
  /** Alias legacy éventuel */
  conge?: string | null;
  cree_le: string;
  cree_par: string | null;
  modif_le: string;
  modif_par: string | null;
}

export const MIGRATION_003_EMPLOYES = {
  version: "003",
  name: "employes",
  tables: ["employes"] as const,
  foreignKeys: false,
  scope: "profil + coordonnees + audit",
  status: "pending_review" as const,
};
