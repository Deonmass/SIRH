import { NextResponse } from "next/server";
import { listCharroiTypesCourse } from "@/lib/repositories/charroi";
import {
  createTypeCours,
  deleteTypeCours,
  listTypeCours,
  updateTypeCours,
  type TypeCours,
} from "@/lib/repositories/type-cours";

export async function GET(request: Request) {
  try {
    const planning = new URL(request.url).searchParams.get("planning") === "1";
    if (planning) {
      return NextResponse.json(await listCharroiTypesCourse());
    }
    return NextResponse.json(await listTypeCours());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.designation?.trim()) {
      return NextResponse.json({ error: "Désignation requise" }, { status: 400 });
    }
    const item = await createTypeCours({
      designation: body.designation.trim(),
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as TypeCours;
    if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    if (!body.designation?.trim()) {
      return NextResponse.json({ error: "Désignation requise" }, { status: 400 });
    }
    const item = await updateTypeCours(body);
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
    await deleteTypeCours(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
