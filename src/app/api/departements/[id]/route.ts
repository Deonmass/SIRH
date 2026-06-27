import { NextResponse } from "next/server";
import { deleteDepartement, getDepartement, saveDepartement } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const departement = await getDepartement(id);
  if (!departement) {
    return NextResponse.json({ error: "Département introuvable" }, { status: 404 });
  }
  return NextResponse.json(departement);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await getDepartement(id);
  if (!existing) {
    return NextResponse.json({ error: "Département introuvable" }, { status: 404 });
  }
  const body = await request.json();
  const departement = await saveDepartement({ ...existing, ...body, id });
  return NextResponse.json(departement);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteDepartement(id);
  if (!ok) {
    return NextResponse.json({ error: "Département introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
