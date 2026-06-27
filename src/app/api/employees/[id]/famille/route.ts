import { NextResponse } from "next/server";
import { getEmployee, listFamilyForEmployee, saveFamilyMember } from "@/lib/store";
import type { FamilyMember } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const employee = await getEmployee(id);
  if (!employee) {
    return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
  }
  const family = await listFamilyForEmployee(id);
  return NextResponse.json(family);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    const employee = await getEmployee(id);
    if (!employee) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }

    const body = (await request.json()) as Partial<FamilyMember>;
    if (!body.prenom?.trim()) {
      return NextResponse.json({ error: "Prénom requis" }, { status: 400 });
    }
    if (!body.dateNaissance?.trim()) {
      return NextResponse.json({ error: "Date de naissance requise" }, { status: 400 });
    }
    if (!body.relation) {
      return NextResponse.json({ error: "Lien de parenté requis" }, { status: 400 });
    }

    const member = await saveFamilyMember(id, {
      relation: body.relation,
      sexe: body.sexe,
      nom: body.nom?.trim() || employee.nom,
      prenom: body.prenom.trim(),
      dateNaissance: body.dateNaissance,
      aCharge: body.aCharge ?? false,
      scolarise: body.scolarise,
      jugementRecu: body.jugementRecu,
      jugementFileRef: body.jugementFileRef,
      jugementFileName: body.jugementFileName,
    });

    if (!member) {
      return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
    }

    const family = await listFamilyForEmployee(id);
    return NextResponse.json({ member, family });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur lors de l'enregistrement du membre.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
