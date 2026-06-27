import { v4 as uuidv4 } from "uuid";
import {
  EMPTY_EMPLOYE_COORDONNEES_JSON,
  type DbCoordonneeJsonEntry,
  type DbEmployeCoordonneesJson,
} from "../../../../database/migrations/008_employes_coordonnees.types";
import { getEmployeeDossier } from "@/lib/employee-dossier";
import type { CoordinatesHistoryEntry, Employee } from "@/lib/types";

export function parseEmployeCoordonneesJson(raw: unknown): DbEmployeCoordonneesJson {
  if (!raw || typeof raw !== "object") return { ...EMPTY_EMPLOYE_COORDONNEES_JSON };
  const parsed = raw as DbEmployeCoordonneesJson;
  return {
    historique: Array.isArray(parsed.historique) ? parsed.historique : [],
  };
}

function sortCoordinatesDesc(entries: CoordinatesHistoryEntry[]): CoordinatesHistoryEntry[] {
  return [...entries].sort((a, b) => {
    const byDate = b.effectiveDate.localeCompare(a.effectiveDate);
    if (byDate !== 0) return byDate;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function coordsEntryFromJson(entry: DbCoordonneeJsonEntry): CoordinatesHistoryEntry {
  return {
    id: entry.id,
    effectiveDate: entry.date_effet,
    adresse: entry.adresse ?? undefined,
    telephone: entry.tel ?? undefined,
    email: entry.email_pro ?? undefined,
    ville: entry.ville ?? undefined,
    province: entry.province ?? undefined,
    pays: entry.pays ?? undefined,
    telephoneSecondaire: entry.tel_secondaire ?? undefined,
    emailPersonnel: entry.email_perso ?? undefined,
    contactUrgence: entry.contact_urgence ?? undefined,
    telephoneUrgence: entry.tel_urgence ?? undefined,
    reason: entry.motif ?? undefined,
    createdAt: entry.cree_le,
    createdBy: entry.cree_par ?? undefined,
  };
}

export function coordsEntryToJson(entry: CoordinatesHistoryEntry): DbCoordonneeJsonEntry {
  return {
    id: entry.id,
    date_effet: entry.effectiveDate,
    adresse: entry.adresse ?? null,
    tel: entry.telephone ?? null,
    email_pro: entry.email ?? null,
    ville: entry.ville ?? null,
    province: entry.province ?? null,
    pays: entry.pays ?? null,
    tel_secondaire: entry.telephoneSecondaire ?? null,
    email_perso: entry.emailPersonnel ?? null,
    contact_urgence: entry.contactUrgence ?? null,
    tel_urgence: entry.telephoneUrgence ?? null,
    motif: entry.reason ?? null,
    cree_le: entry.createdAt,
    cree_par: entry.createdBy ?? null,
  };
}

export function coordinatesHistoryFromJson(raw: unknown): CoordinatesHistoryEntry[] {
  const json = parseEmployeCoordonneesJson(raw);
  return sortCoordinatesDesc(json.historique.map(coordsEntryFromJson));
}

export function coordinatesHistoryToEmployeJson(
  history: CoordinatesHistoryEntry[]
): DbEmployeCoordonneesJson {
  return {
    historique: sortCoordinatesDesc(history).map(coordsEntryToJson),
  };
}

export function snapshotFromEmployee(employee: Employee): Omit<CoordinatesHistoryEntry, "id" | "createdAt"> {
  const dossier = getEmployeeDossier(employee);
  return {
    effectiveDate: new Date().toISOString().slice(0, 10),
    adresse: employee.adresse,
    telephone: employee.telephone,
    email: employee.email,
    ville: dossier.ville,
    province: dossier.province,
    pays: dossier.pays,
    telephoneSecondaire: dossier.telephoneSecondaire,
    emailPersonnel: dossier.emailPersonnel,
    contactUrgence: dossier.contactUrgence,
    telephoneUrgence: dossier.telephoneUrgence,
    reason: "Coordonnées en vigueur",
  };
}

export function seedCoordinatesHistoryFromEmployee(employee: Employee): CoordinatesHistoryEntry[] {
  const snap = snapshotFromEmployee(employee);
  const hasData =
    snap.adresse ||
    snap.telephone ||
    snap.email ||
    snap.ville ||
    snap.telephoneSecondaire ||
    snap.emailPersonnel;

  if (!hasData) return [];

  const now = new Date().toISOString();
  return [
    {
      id: uuidv4(),
      ...snap,
      effectiveDate: employee.createdAt?.slice(0, 10) ?? now.slice(0, 10),
      reason: "Coordonnées initiales",
      createdAt: employee.createdAt ?? now,
    },
  ];
}

export function resolveCoordinatesHistory(
  employee: Employee,
  rowJson: unknown
): CoordinatesHistoryEntry[] {
  const fromJson = coordinatesHistoryFromJson(rowJson);
  if (fromJson.length > 0) return fromJson;
  if (employee.coordinatesHistory?.length) {
    return sortCoordinatesDesc(employee.coordinatesHistory);
  }
  return seedCoordinatesHistoryFromEmployee(employee);
}

export function applyCoordinatesEntryToEmployee(
  employee: Employee,
  entry: CoordinatesHistoryEntry
): Employee {
  const dossier = getEmployeeDossier(employee);
  return {
    ...employee,
    adresse: entry.adresse ?? employee.adresse,
    telephone: entry.telephone ?? employee.telephone,
    email: entry.email ?? employee.email,
    dossier: {
      ...dossier,
      ville: entry.ville ?? dossier.ville,
      province: entry.province ?? dossier.province,
      pays: entry.pays ?? dossier.pays,
      telephoneSecondaire: entry.telephoneSecondaire ?? dossier.telephoneSecondaire,
      emailPersonnel: entry.emailPersonnel ?? dossier.emailPersonnel,
      contactUrgence: entry.contactUrgence ?? dossier.contactUrgence,
      telephoneUrgence: entry.telephoneUrgence ?? dossier.telephoneUrgence,
    },
  };
}

export function appendCoordinatesHistoryEntry(
  employee: Employee,
  partial: Omit<CoordinatesHistoryEntry, "id" | "createdAt">
): Employee {
  const entry: CoordinatesHistoryEntry = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...partial,
  };
  const history = sortCoordinatesDesc([...(employee.coordinatesHistory ?? []), entry]);
  return {
    ...applyCoordinatesEntryToEmployee(employee, entry),
    coordinatesHistory: history,
  };
}
