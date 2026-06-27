import { NextResponse } from "next/server";
import { computeFormationsDashboard } from "@/lib/formations-dashboard";
import { rowToFormationRecord } from "@/lib/formations-utils";
import { listFormationsFromDb } from "@/lib/repositories/formations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());

  try {
    const rows = await listFormationsFromDb();
    const formations = rows.map(rowToFormationRecord);
    const data = computeFormationsDashboard(formations, year);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur dashboard formations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
