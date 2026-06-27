import { NextResponse } from "next/server";
import { buildPaieMasseForPeriodFromDb } from "@/lib/paie-masse.server";
import { currentPayPeriod } from "@/lib/payslip-engine";
import { getDatabase, getSettings } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? currentPayPeriod();
  const db = await getDatabase();
  const settings = await getSettings();
  const masse = await buildPaieMasseForPeriodFromDb(db, settings, period);
  return NextResponse.json(masse);
}
