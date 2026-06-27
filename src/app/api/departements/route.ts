import { NextResponse } from "next/server";
import { createDepartement, getDepartements } from "@/lib/store";

export async function GET() {
  const departements = await getDepartements();
  return NextResponse.json(departements);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.libelle?.trim()) {
      return NextResponse.json({ error: "Libellé requis" }, { status: 400 });
    }
    const departement = await createDepartement({
      code: body.code?.trim(),
      libelle: String(body.libelle).trim(),
      ordre: body.ordre,
      actif: body.actif ?? true,
      description: body.description ?? "",
    });
    return NextResponse.json(departement, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
