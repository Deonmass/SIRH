import { NextResponse } from "next/server";
import { computeCongesDashboard } from "@/lib/conges-dashboard";
import { getEmployees, listAllConges } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year") ?? now.getFullYear());
  const month = Number(searchParams.get("month") ?? now.getMonth());

  const [conges, employees] = await Promise.all([listAllConges(), getEmployees()]);
  const data = computeCongesDashboard(conges, employees, year, month);
  return NextResponse.json({ year, month, ...data });
}
