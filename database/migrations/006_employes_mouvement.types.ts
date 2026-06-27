/**
 * Mouvements embarqués — colonne `employes.mouvement` (JSONB)
 */

import type { DbTypeMouvement } from "./004_mouvements.types";

export interface DbEmployeExtraCostsJson {
  housing: number;
  mileage: number;
  childrenEducation: number;
  travel: number;
  variables: number;
  currency: "USD" | "CDF";
}

/** Entrée JSON d'un mouvement (champs table + dossier) */
export interface DbMouvementJsonEntry {
  id: string;
  code_mouvement: string;
  type_mouvement: DbTypeMouvement;
  date_mouvement: string;
  code_poste: string | null;
  document_annexe: string | null;
  motif: string;
  legal_basis?: string | null;
  approved_by?: string | null;
  from_position?: string | null;
  to_position?: string | null;
  from_department?: string | null;
  to_department?: string | null;
  from_salary?: number | null;
  to_salary?: number | null;
  effective_date: string;
  /** Coûts extra saisis lors de l'affectation / mouvement */
  couts_extra?: DbEmployeExtraCostsJson | null;
  cree_le: string;
  cree_par: string | null;
  modif_le: string;
  modif_par: string | null;
}

/** Heures sup. hors temps normal, regroupées par mois (YYYY-MM) */
export interface DbOvertimeMonthlyEntryJson {
  id: string;
  mois_annee: string;
  h_130: number;
  h_160: number;
  h_200: number;
  regime_j?: 22 | 26 | null;
  notes?: string | null;
  cree_le: string;
  modif_le: string;
}

export interface DbEmployeMouvementJson {
  historique: DbMouvementJsonEntry[];
  /** Coûts extra en vigueur (saisie dossier ou dernière affectation) */
  couts_extra?: DbEmployeExtraCostsJson | null;
  /** Heures supplémentaires mensuelles (dossier employé) */
  heures_sup_mensuelles?: DbOvertimeMonthlyEntryJson[];
}

export const EMPTY_EMPLOYE_MOUVEMENT_JSON: DbEmployeMouvementJson = { historique: [] };
