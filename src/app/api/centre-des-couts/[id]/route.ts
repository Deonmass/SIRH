import { NextResponse } from "next/server";
import { getCentreDesCoutsItem } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getCentreDesCoutsItem(id);
    if (!item) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
