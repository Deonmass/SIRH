import { NextResponse } from "next/server";
import {
  deleteFamilyMember,
  getEmployee,
  listFamilyForEmployee,
  updateFamilyMember,
} from "@/lib/store";
import type { FamilyMember } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: rawId, memberId: rawMemberId } = await params;
    const id = decodeURIComponent(rawId);
    const memberId = decodeURIComponent(rawMemberId);
    const employee = await getEmployee(id);
    if (!employee) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }

    const body = (await request.json()) as Partial<FamilyMember>;
    const familyBefore = await listFamilyForEmployee(id);
    const existing = familyBefore.find((m) => m.id === memberId);
    if (!existing) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
    }

    const merged: FamilyMember = {
      ...existing,
      ...body,
      id: memberId,
      nom: body.nom?.trim() || existing.nom,
      prenom: body.prenom?.trim() || existing.prenom,
      dateNaissance: body.dateNaissance ?? existing.dateNaissance,
      relation: body.relation ?? existing.relation,
    };

    const member = await updateFamilyMember(id, memberId, merged);
    if (!member) {
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }

    const family = await listFamilyForEmployee(id);
    return NextResponse.json({ member, family });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur lors de la mise à jour du membre.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: rawId, memberId: rawMemberId } = await params;
    const id = decodeURIComponent(rawId);
    const memberId = decodeURIComponent(rawMemberId);
    const employee = await getEmployee(id);
    if (!employee) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }

    const ok = await deleteFamilyMember(id, memberId);
    if (!ok) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
    }

    const family = await listFamilyForEmployee(id);
    return NextResponse.json({ success: true, family });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur lors de la suppression du membre.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
