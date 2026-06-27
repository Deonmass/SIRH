import { NextResponse } from "next/server";
import { getEmployeeDossierBundle } from "@/lib/store";

/** Chargement groupé du dossier (mouvements, solde, congés, …). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const bundle = await getEmployeeDossierBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
  }
  return NextResponse.json(bundle);
}
