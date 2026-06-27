import type { DocumentItem } from "@/lib/types";

/** Item document — colonne `employes.document` (JSONB) */
export interface DbDocumentJsonItem {
  id: string;
  label: string;
  category: DocumentItem["category"];
  requis: boolean;
  recu: boolean;
  recu_le?: string | null;
  expiration?: string | null;
  fichier_ref?: string | null;
  fichier_nom?: string | null;
  fichier_taille?: number | null;
  televerse_le?: string | null;
  ref_legale?: string | null;
}

export interface DbEmployeDocumentJson {
  items: DbDocumentJsonItem[];
}

export const EMPTY_EMPLOYE_DOCUMENT_JSON: DbEmployeDocumentJson = { items: [] };

export const MIGRATION_009_EMPLOYES_DOCUMENT = {
  version: "009",
  name: "employes_document",
  column: "document",
  status: "pending_review" as const,
};
