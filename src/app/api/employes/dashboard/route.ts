import { NextResponse } from "next/server";
import { buildEmployesDashboardDetail } from "@/lib/employes-dashboard-detail";
import { getDatabase } from "@/lib/store";

export const dynamic = "force-dynamic";

function parsePeriod(searchParams: URLSearchParams) {
  const now = new Date();
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  if (Number.isNaN(year)) return { year: now.getFullYear() as number, month: null as number | null };
  if (!monthParam) return { year, month: null };
  const month = Number(monthParam);
  if (Number.isNaN(month) || month < 1 || month > 12) return { year, month: null };
  return { year, month };
}

export async function GET(request: Request) {
  try {
    const period = parsePeriod(new URL(request.url).searchParams);
    const db = await getDatabase();
    const stats = buildEmployesDashboardDetail(db, period);
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
