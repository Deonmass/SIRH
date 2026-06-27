import {
  EMPTY_EMPLOYE_DOCUMENT_JSON,
  type DbDocumentJsonItem,
  type DbEmployeDocumentJson,
} from "../../../../database/migrations/009_employes_document.types";
import { createDefaultDocuments, DEFAULT_DOCUMENTS } from "@/lib/constants";
import type { DocumentItem } from "@/lib/types";

const VALID_CATEGORIES = new Set<DocumentItem["category"]>([
  "identite",
  "contrat",
  "social",
  "medical",
  "bancaire",
  "formation",
  "famille",
  "paie",
]);

export function parseEmployeDocumentJson(raw: unknown): DbEmployeDocumentJson {
  if (!raw || typeof raw !== "object") return { ...EMPTY_EMPLOYE_DOCUMENT_JSON };
  const parsed = raw as DbEmployeDocumentJson;
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}

function mergeMissingDocuments(documents: DocumentItem[]): DocumentItem[] {
  const byId = new Map(documents.map((d) => [d.id, d]));
  for (const template of DEFAULT_DOCUMENTS) {
    if (!byId.has(template.id)) {
      byId.set(template.id, {
        ...template,
        received: false,
      });
    }
  }
  return Array.from(byId.values());
}

export function documentItemFromJson(item: DbDocumentJsonItem): DocumentItem {
  const category = VALID_CATEGORIES.has(item.category) ? item.category : "identite";
  return {
    id: item.id,
    label: item.label,
    category,
    required: item.requis,
    received: item.recu,
    receivedAt: item.recu_le ?? undefined,
    expiryDate: item.expiration ?? undefined,
    fileRef: item.fichier_ref ?? undefined,
    fileName: item.fichier_nom ?? undefined,
    fileSize: item.fichier_taille ?? undefined,
    uploadedAt: item.televerse_le ?? undefined,
    legalRef: item.ref_legale ?? undefined,
  };
}

export function documentItemToJson(item: DocumentItem): DbDocumentJsonItem {
  return {
    id: item.id,
    label: item.label,
    category: item.category,
    requis: item.required,
    recu: item.received,
    recu_le: item.receivedAt ?? null,
    expiration: item.expiryDate ?? null,
    fichier_ref: item.fileRef ?? null,
    fichier_nom: item.fileName ?? null,
    fichier_taille: item.fileSize ?? null,
    televerse_le: item.uploadedAt ?? null,
    ref_legale: item.legalRef ?? null,
  };
}

export function documentsFromJson(raw: unknown): DocumentItem[] {
  const json = parseEmployeDocumentJson(raw);
  return json.items.map(documentItemFromJson);
}

export function documentsToEmployeJson(documents: DocumentItem[]): DbEmployeDocumentJson {
  return {
    items: mergeMissingDocuments(documents).map(documentItemToJson),
  };
}

export function hasDocumentJsonContent(raw: unknown): boolean {
  return parseEmployeDocumentJson(raw).items.length > 0;
}

/** Documents effectifs : JSON Supabase prioritaire, sinon cache local. */
export function resolveEmployeeDocuments(
  localDocuments: DocumentItem[] | undefined,
  rowJson: unknown
): DocumentItem[] {
  if (hasDocumentJsonContent(rowJson)) {
    return mergeMissingDocuments(documentsFromJson(rowJson));
  }
  if (localDocuments?.length) {
    return mergeMissingDocuments(localDocuments);
  }
  return createDefaultDocuments();
}

export function defaultDocumentsToEmployeJson(): DbEmployeDocumentJson {
  return documentsToEmployeJson(createDefaultDocuments());
}
