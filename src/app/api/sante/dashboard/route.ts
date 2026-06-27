import { NextResponse } from "next/server";
import { listHopitalVisites } from "@/lib/repositories/hopital-visite";
import { buildSanteDashboard } from "@/lib/sante-dashboard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearRaw = searchParams.get("year");
    const monthRaw = searchParams.get("month");
    const date = searchParams.get("date")?.trim() || undefined;
    const hopital = searchParams.get("hopital")?.trim() || undefined;

    const filters = {
      year: yearRaw ? Number(yearRaw) : undefined,
      month: monthRaw ? Number(monthRaw) : undefined,
      date,
      hopital,
    };

    const visites = await listHopitalVisites();
    return NextResponse.json(buildSanteDashboard(visites, filters));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
