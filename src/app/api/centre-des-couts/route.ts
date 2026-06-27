import { NextResponse } from "next/server";
import { getCentreDesCouts } from "@/lib/store";

/** Lecture du référentiel (source : `configuration` — titre « Centres de coûts »). */
export async function GET() {
  try {
    const items = await getCentreDesCouts();
    return NextResponse.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    console.error("[api/centre-des-couts GET]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
