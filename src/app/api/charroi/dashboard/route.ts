import { NextResponse } from "next/server";
import { buildDeclarationDashboardStats } from "@/lib/charroi-vehicule-declaration";
import { getCharroiDashboardStats } from "@/lib/repositories/charroi";
import { listVehicules } from "@/lib/repositories/vehicules";

function parsePeriod(searchParams: URLSearchParams) {
  const now = new Date();
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  if (Number.isNaN(year)) return { year: now.getFullYear() as number };
  if (!monthParam) return { year };
  const month = Number(monthParam);
  if (Number.isNaN(month) || month < 1 || month > 12) return { year };
  return { year, month };
}

export async function GET(request: Request) {
  try {
    const period = parsePeriod(new URL(request.url).searchParams);
    const [stats, vehicules] = await Promise.all([
      getCharroiDashboardStats(period),
      listVehicules(),
    ]);
    return NextResponse.json({
      ...stats,
      declaration: buildDeclarationDashboardStats(vehicules),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
