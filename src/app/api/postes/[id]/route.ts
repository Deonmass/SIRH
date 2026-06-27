import { NextResponse } from "next/server";
import { deletePosition, getPosition, savePosition } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const position = await getPosition(id);
  if (!position) {
    return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });
  }
  return NextResponse.json(position);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getPosition(id);
    if (!existing) {
      return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });
    }
    const body = await request.json();
    if (body.title !== undefined && !String(body.title).trim()) {
      return NextResponse.json({ error: "L'intitulé du poste est obligatoire." }, { status: 400 });
    }
    const position = await savePosition({ ...existing, ...body, id });
    return NextResponse.json(position);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    console.error("[api/postes PATCH]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deletePosition(id);
  if (!ok) {
    return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
