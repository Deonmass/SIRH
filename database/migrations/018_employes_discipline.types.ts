import type { DisciplinaryStatus, DisciplinaryType } from "@/lib/types";

/** Entrée sanction dans employes.discipline */
export interface DbDisciplinaryEntryJson {
  id: string;
  type: DisciplinaryType;
  date: string;
  date_effet?: string | null;
  date_fin?: string | null;
  motif: string;
  faits: string;
  base_legale?: string | null;
  emis_par?: string | null;
  reponse_employe?: string | null;
  reconnu: boolean;
  reconnu_le?: string | null;
  document_lie_id?: string | null;
  severite: 1 | 2 | 3 | 4 | 5;
  statut: DisciplinaryStatus;
  cree_le?: string;
  modif_le?: string;
}

export interface DbEmployeDisciplineJson {
  historique: DbDisciplinaryEntryJson[];
}

export const EMPTY_EMPLOYE_DISCIPLINE_JSON: DbEmployeDisciplineJson = {
  historique: [],
};
