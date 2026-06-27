import type { DbEmployeRow } from "../../../../database/migrations/003_employes.types";
import {
  soldeCongeToLeaveBalance,
  type SoldeCongePayload,
} from "@/lib/conges-balance";
import { encodeSoldeCongeColumn, parseSoldeCongeColumn } from "@/lib/solde-conges-json";
import { EMPTY_EMPLOYE_MOUVEMENT_JSON } from "../../../../database/migrations/006_employes_mouvement.types";
import { createDefaultDocuments, createDefaultWorkflow } from "@/lib/constants";
import { defaultExtraCosts } from "@/lib/extra-costs";
import type { Employee, MaritalStatus, Sexe } from "@/lib/types";
import { parseEmployeStatut } from "./employe-statut";
import {
  coordinatesHistoryToEmployeJson,
  resolveCoordinatesHistory,
} from "./coordonnees-json";
import {
  documentsToEmployeJson,
  resolveEmployeeDocuments,
} from "./documents-json";
import {
  employeMouvementJsonToMovements,
  movementsToEmployeMouvementJson,
  parseEmployeMouvementJson,
  parseExtraCostsFromMouvementJson,
} from "./mouvement-json";
import {
  disciplinaryRecordsToPayload,
  encodeEmployeDiscipline,
  listDisciplinaryRecordsFromPayload,
  parseEmployeDiscipline,
} from "@/lib/employes-discipline-json";
import { countDisciplinaryWarnings } from "@/lib/disciplinary";
import {
  listOvertimeRecordsFromMouvementRaw,
  overtimeRecordsToMouvementEntries,
} from "@/lib/employes-overtime-json";

export function employeIdToApp(id: number): string {
  return String(id);
}

export function employeIdFromApp(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Identifiant employé invalide : ${id}`);
  }
  return n;
}

export function rowToEmployee(row: DbEmployeRow): Employee {
  const id = employeIdToApp(row.id);
  const mouvement = parseEmployeMouvementJson(row.mouvement);
  const extraFromJson =
    parseExtraCostsFromMouvementJson(mouvement.couts_extra) ?? defaultExtraCosts("USD");

  const base: Employee = {
    id,
    matricule: row.matricule,
    nom: row.nom,
    postNom: row.post_nom ?? undefined,
    prenom: row.prenom,
    sexe: row.sexe,
    dateNaissance: row.date_naiss ?? undefined,
    lieuNaissance: row.lieu_naiss ?? undefined,
    nationalite: row.nationalite,
    maritalStatus: row.statut_mat,
    adresse: row.adresse ?? undefined,
    email: row.email_pro ?? undefined,
    telephone: row.tel ?? undefined,
    grade: "Agent",
    status: parseEmployeStatut(row.statut),
    employeeKind: "interne",
    subcontractorId: null,
    journalierProviderId: null,
    contractType: "CDI",
    department: "",
    position: "",
    category: 3,
    childrenCount: 0,
    salary: {
      baseSalary: 0,
      currency: "USD",
      category: 3,
      allowances: [],
    },
    workflow: createDefaultWorkflow(0),
    documents: createDefaultDocuments(),
    family: [],
    movements: employeMouvementJsonToMovements(row.mouvement, id),
    leaveBalance: soldeCongeToLeaveBalance(parseSoldeCongeColumn(row.solde_conge)),
    warningsCount: 0,
    overtime: { hours130: 0, hours160: 0, hours200: 0 },
    disciplinaryRecords: [],
    extraCosts: extraFromJson,
    createdAt: row.cree_le,
    updatedAt: row.modif_le,
  };

  const disciplinePayload = parseEmployeDiscipline(row.discipline);
  const disciplinaryRecords = listDisciplinaryRecordsFromPayload(disciplinePayload);
  const coordinatesHistory = resolveCoordinatesHistory(base, row.coordonnees);
  const documents = resolveEmployeeDocuments(undefined, row.document);
  const mouvementParsed = parseEmployeMouvementJson(row.mouvement);
  const overtimeMonthlyRecords = listOvertimeRecordsFromMouvementRaw(mouvementParsed);
  return {
    ...base,
    coordinatesHistory,
    documents,
    disciplinaryRecords,
    warningsCount: countDisciplinaryWarnings(disciplinaryRecords),
    overtimeMonthlyRecords,
  };
}

/** Champs table `employes` écrasés par Supabase lors d'une fusion. */
export function profilCoordsFromRow(row: DbEmployeRow): Pick<
  Employee,
  | "id"
  | "matricule"
  | "nom"
  | "postNom"
  | "prenom"
  | "sexe"
  | "dateNaissance"
  | "lieuNaissance"
  | "nationalite"
  | "maritalStatus"
  | "adresse"
  | "email"
  | "telephone"
  | "status"
  | "createdAt"
  | "updatedAt"
> {
  return {
    id: employeIdToApp(row.id),
    matricule: row.matricule,
    nom: row.nom,
    postNom: row.post_nom ?? undefined,
    prenom: row.prenom,
    sexe: row.sexe,
    dateNaissance: row.date_naiss ?? undefined,
    lieuNaissance: row.lieu_naiss ?? undefined,
    nationalite: row.nationalite,
    maritalStatus: row.statut_mat,
    adresse: row.adresse ?? undefined,
    email: row.email_pro ?? undefined,
    telephone: row.tel ?? undefined,
    status: parseEmployeStatut(row.statut),
    createdAt: row.cree_le,
    updatedAt: row.modif_le,
  };
}

export function leaveBalanceToSoldeCongeJson(
  employee: Employee,
  existing?: SoldeCongePayload | null,
  existingRaw?: string | null
): string | null {
  const lb = employee.leaveBalance;
  const existingParsed = existingRaw
    ? parseSoldeCongeColumn(existingRaw)
    : existing ?? null;
  if (!lb || (lb.acquired === 0 && lb.taken === 0 && lb.remaining === 0 && !existingParsed)) {
    return existingParsed ? encodeSoldeCongeColumn(existingParsed) : null;
  }
  const payload: SoldeCongePayload = {
    annee: lb.serviceYear ?? existingParsed?.annee ?? new Date().getFullYear(),
    acquis: lb.acquired,
    pris: lb.taken,
    restant: lb.remaining,
    reinit_le: lb.reinitAt ?? existingParsed?.reinit_le ?? new Date().toISOString().slice(0, 10),
    date_reference:
      lb.referenceDate ?? existingParsed?.date_reference ?? new Date().toISOString().slice(0, 10),
    grade: lb.grade ?? existingParsed?.grade ?? employee.grade ?? null,
    categorie: lb.category ?? existingParsed?.categorie ?? employee.category ?? null,
    bonus_anciennete: existingParsed?.bonus_anciennete,
    jours_par_mois: existingParsed?.jours_par_mois,
    source: existingParsed?.source ?? "code_travail_art141",
  };
  return encodeSoldeCongeColumn(payload);
}

/** Champs profil / statut — sans colonnes JSON dédiées (mouvement, coordonnees, …). */
export function employeeToProfilePatch(
  employee: Employee,
  audit?: { modif_par?: string | null }
): Pick<
  DbEmployeRow,
  | "matricule"
  | "nom"
  | "post_nom"
  | "prenom"
  | "sexe"
  | "date_naiss"
  | "lieu_naiss"
  | "nationalite"
  | "statut_mat"
  | "statut"
  | "adresse"
  | "email_pro"
  | "tel"
  | "modif_par"
> {
  return {
    matricule: employee.matricule,
    nom: employee.nom,
    post_nom: employee.postNom ?? null,
    prenom: employee.prenom,
    sexe: employee.sexe,
    date_naiss: employee.dateNaissance ?? null,
    lieu_naiss: employee.lieuNaissance ?? null,
    nationalite: employee.nationalite || "Congolaise (RDC)",
    statut_mat: employee.maritalStatus ?? "celibataire",
    statut: employee.status,
    adresse: employee.adresse ?? null,
    email_pro: employee.email ?? null,
    tel: employee.telephone ?? null,
    modif_par: audit?.modif_par ?? null,
  };
}

export function employeeToRow(
  employee: Employee,
  audit?: { cree_par?: string | null; modif_par?: string | null },
  soldeCongeRaw?: string | null
): Omit<DbEmployeRow, "id" | "cree_le" | "modif_le"> {
  return {
    ...employeeToProfilePatch(employee, audit),
    mouvement: movementsToEmployeMouvementJson(
      employee.movements ?? [],
      employee.extraCosts,
      {
        heures_sup_mensuelles: employee.overtimeMonthlyRecords?.length
          ? overtimeRecordsToMouvementEntries(employee.overtimeMonthlyRecords)
          : undefined,
      }
    ),
    coordonnees: coordinatesHistoryToEmployeJson(employee.coordinatesHistory ?? []),
    document: documentsToEmployeJson(employee.documents ?? []),
    solde_conge: soldeCongeRaw ?? leaveBalanceToSoldeCongeJson(employee),
    conges: null,
    discipline: encodeEmployeDisciplineColumn(employee),
    cree_par: audit?.cree_par ?? null,
  };
}

export function encodeEmployeDisciplineColumn(employee: Employee): string | null {
  const records = employee.disciplinaryRecords ?? [];
  if (records.length === 0) return null;
  return encodeEmployeDiscipline(disciplinaryRecordsToPayload(records));
}

export type CreateEmployeInput = {
  matricule: string;
  nom: string;
  prenom: string;
  post_nom?: string | null;
  sexe?: Sexe;
  date_naiss?: string | null;
  lieu_naiss?: string | null;
  nationalite?: string;
  statut_mat?: MaritalStatus;
  adresse?: string | null;
  email_pro?: string | null;
  tel?: string | null;
  cree_par?: string | null;
};
