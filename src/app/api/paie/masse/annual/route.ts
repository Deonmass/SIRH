import { NextResponse } from "next/server";
import {
  buildPaieMasseAnnualSeriesFromDb,
  buildPaieMasseForPeriodFromDb,
} from "@/lib/paie-masse.server";
import { getDatabase, getSettings } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Année invalide" }, { status: 400 });
  }

  const db = await getDatabase();
  const settings = await getSettings();
  const series = await buildPaieMasseAnnualSeriesFromDb(db, settings, year);
  const sample = await buildPaieMasseForPeriodFromDb(db, settings, `${year}-01`);

  return NextResponse.json({
    year,
    currency: sample.currency,
    series,
  });
}
