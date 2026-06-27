import { NextResponse } from "next/server";
import { moisAnneeFromParts } from "@/lib/pointage-utils";
import { buildPointageDashboard } from "@/lib/pointage-dashboard";
import { getEmployees } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
    const moisAnnee = moisAnneeFromParts(year, month);
    const employees = await getEmployees();
    const data = await buildPointageDashboard(employees, moisAnnee);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur dashboard pointage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
