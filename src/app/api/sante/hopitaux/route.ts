import { NextResponse } from "next/server";
import {
  createHopital,
  deleteHopital,
  listHopitaux,
  updateHopital,
  type Hopital,
} from "@/lib/repositories/hopitaux";

export async function GET() {
  try {
    const items = await listHopitaux();
    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.hopital?.trim()) {
      return NextResponse.json({ error: "Nom d'hôpital requis" }, { status: 400 });
    }
    const item = await createHopital({
      hopital: body.hopital.trim(),
      dateDebutContrat: body.dateDebutContrat,
      statut: body.statut ?? "actif",
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Hopital;
    if (!body.id || !body.hopital?.trim()) {
      return NextResponse.json({ error: "id et nom d'hôpital requis" }, { status: 400 });
    }
    const item = await updateHopital({
      ...body,
      hopital: body.hopital.trim(),
      statut: body.statut ?? "actif",
    });
    return NextResponse.json(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    await deleteHopital(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
