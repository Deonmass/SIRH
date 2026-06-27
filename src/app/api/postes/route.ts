import { NextResponse } from "next/server";
import { isVacantForListing } from "@/lib/poste-headcount";
import { createPosition, getEmployees, getPositions } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vacant = searchParams.get("vacant") === "1";
  const [positions, employees] = await Promise.all([getPositions(), getEmployees()]);
  const list = vacant
    ? positions.filter((p) => isVacantForListing(p, employees))
    : positions.filter((p) => p.status !== "archived");
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.title?.trim()) {
      return NextResponse.json({ error: "L'intitulé du poste est obligatoire." }, { status: 400 });
    }
    const position = await createPosition(body);
    return NextResponse.json(position, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    console.error("[api/postes POST]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
