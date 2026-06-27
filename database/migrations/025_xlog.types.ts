/** Migration 025 — table `Xlog` (journal d'activité) */

export type ActivityAction =
  | "insertion"
  | "modification"
  | "suppression"
  | "desactivation"
  | "activation"
  | "connexion"
  | "annulation";

export type ActivityEntityType =
  | "employe"
  | "utilisateur"
  | "departement"
  | "poste"
  | "conge"
  | "formation"
  | "mouvement"
  | "configuration"
  | "pointage"
  | "paie";

export interface DbXlogRow {
  id: number;
  utilisateur: string | null;
  action: ActivityAction;
  created_at: string;
  created_by: string | null;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  entity_label: string | null;
  summary: string;
  payload_before: Record<string, unknown> | null;
  payload_after: Record<string, unknown> | null;
  undone_at: string | null;
  undone_by: string | null;
}

export const MIGRATION_025_XLOG = {
  version: "025",
  name: "xlog",
  tables: ["Xlog"] as const,
  foreignKeys: false,
  status: "pending_review" as const,
};
