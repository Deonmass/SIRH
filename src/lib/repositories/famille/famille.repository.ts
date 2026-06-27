import type { DbFamilleRow } from "../../../../database/migrations/005_famille.types";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";
import type { FamilyMember } from "@/lib/types";
import {
  familyMemberToInsertRow,
  familyMemberToUpdateRow,
  familleIdFromApp,
} from "./mapper";

const TABLE = "famille";

function client() {
  return createSupabaseAdminAnonClient();
}

export async function listFamilleByMatricule(matricule: string): Promise<DbFamilleRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .eq("matricule_employe", matricule)
    .order("lien", { ascending: true })
    .order("date_naiss", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`famille.select: ${error.message}`);
  return (data ?? []) as DbFamilleRow[];
}

export async function listAllFamille(): Promise<DbFamilleRow[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("*")
    .order("matricule_employe", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`famille.selectAll: ${error.message}`);
  return (data ?? []) as DbFamilleRow[];
}

export async function createFamilleMember(input: {
  matricule_employe: string;
  member: Omit<FamilyMember, "id">;
  cree_par?: string | null;
}): Promise<DbFamilleRow> {
  const { data, error } = await client()
    .from(TABLE)
    .insert(
      familyMemberToInsertRow({
        matricule_employe: input.matricule_employe,
        relation: input.member.relation,
        sexe: input.member.sexe ?? null,
        nom: input.member.nom,
        prenom: input.member.prenom,
        date_naiss: input.member.dateNaissance,
        a_charge: input.member.aCharge,
        scolarise: input.member.scolarise,
        jugement_recu: input.member.jugementRecu,
        jugement_fichier: input.member.jugementFileRef ?? null,
        jugement_nom: input.member.jugementFileName ?? null,
        cree_par: input.cree_par ?? null,
      })
    )
    .select("*")
    .single();
  if (error) throw new Error(`famille.insert: ${error.message}`);
  return data as DbFamilleRow;
}

export async function updateFamilleMember(
  id: string,
  member: FamilyMember,
  modif_par?: string | null
): Promise<DbFamilleRow> {
  const numericId = familleIdFromApp(id);
  const { data, error } = await client()
    .from(TABLE)
    .update(
      familyMemberToUpdateRow({
        relation: member.relation,
        sexe: member.sexe ?? null,
        nom: member.nom,
        prenom: member.prenom,
        date_naiss: member.dateNaissance,
        a_charge: member.aCharge,
        scolarise: member.scolarise,
        jugement_recu: member.jugementRecu,
        jugement_fichier: member.jugementFileRef ?? null,
        jugement_nom: member.jugementFileName ?? null,
        modif_par: modif_par ?? null,
      })
    )
    .eq("id", numericId)
    .select("*")
    .single();
  if (error) throw new Error(`famille.update: ${error.message}`);
  return data as DbFamilleRow;
}

export async function deleteFamilleMember(id: string): Promise<boolean> {
  const numericId = familleIdFromApp(id);
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq("id", numericId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`famille.delete: ${error.message}`);
  return Boolean(data);
}

export async function deleteFamilleByMatricule(matricule: string): Promise<void> {
  const { error } = await client().from(TABLE).delete().eq("matricule_employe", matricule);
  if (error) throw new Error(`famille.deleteByMatricule: ${error.message}`);
}
