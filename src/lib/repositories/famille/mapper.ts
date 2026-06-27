import type { DbFamilleLien, DbFamilleRow } from "../../../../database/migrations/005_famille.types";
import type { FamilyMember } from "@/lib/types";

export function familleIdToApp(id: number): string {
  return String(id);
}

export function familleIdFromApp(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Identifiant membre famille invalide : ${id}`);
  }
  return n;
}

export function rowToFamilyMember(row: DbFamilleRow): FamilyMember {
  return {
    id: familleIdToApp(row.id),
    relation: row.lien,
    sexe: row.sexe ?? undefined,
    nom: row.nom,
    prenom: row.prenom,
    dateNaissance: row.date_naiss,
    aCharge: row.a_charge,
    scolarise: row.scolarise || undefined,
    jugementRecu: row.jugement_recu || undefined,
    jugementFileRef: row.jugement_fichier ?? undefined,
    jugementFileName: row.jugement_nom ?? undefined,
  };
}

export function familyMemberToInsertRow(input: {
  matricule_employe: string;
  relation: DbFamilleLien;
  sexe?: FamilyMember["sexe"] | null;
  nom: string;
  prenom: string;
  date_naiss: string;
  a_charge?: boolean;
  scolarise?: boolean;
  jugement_recu?: boolean;
  jugement_fichier?: string | null;
  jugement_nom?: string | null;
  cree_par?: string | null;
}): Omit<DbFamilleRow, "id" | "cree_le" | "modif_le" | "modif_par"> {
  return {
    matricule_employe: input.matricule_employe,
    lien: input.relation,
    sexe: input.sexe ?? null,
    nom: input.nom,
    prenom: input.prenom,
    date_naiss: input.date_naiss,
    a_charge: input.a_charge ?? false,
    scolarise: input.scolarise ?? false,
    jugement_recu: input.jugement_recu ?? false,
    jugement_fichier: input.jugement_fichier ?? null,
    jugement_nom: input.jugement_nom ?? null,
    cree_par: input.cree_par ?? null,
  };
}

export function familyMemberToUpdateRow(input: {
  relation: DbFamilleLien;
  sexe?: FamilyMember["sexe"] | null;
  nom: string;
  prenom: string;
  date_naiss: string;
  a_charge?: boolean;
  scolarise?: boolean;
  jugement_recu?: boolean;
  jugement_fichier?: string | null;
  jugement_nom?: string | null;
  modif_par?: string | null;
}): Pick<
  DbFamilleRow,
  | "lien"
  | "sexe"
  | "nom"
  | "prenom"
  | "date_naiss"
  | "a_charge"
  | "scolarise"
  | "jugement_recu"
  | "jugement_fichier"
  | "jugement_nom"
  | "modif_par"
> {
  return {
    lien: input.relation,
    sexe: input.sexe ?? null,
    nom: input.nom,
    prenom: input.prenom,
    date_naiss: input.date_naiss,
    a_charge: input.a_charge ?? false,
    scolarise: input.scolarise ?? false,
    jugement_recu: input.jugement_recu ?? false,
    jugement_fichier: input.jugement_fichier ?? null,
    jugement_nom: input.jugement_nom ?? null,
    modif_par: input.modif_par ?? null,
  };
}
