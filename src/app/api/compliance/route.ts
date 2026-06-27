import { NextResponse } from "next/server";
import { computeComplianceReport } from "@/lib/compliance";
import { getEmployees } from "@/lib/store";

export async function GET() {
  const employees = await getEmployees();
  const report = computeComplianceReport(employees);
  return NextResponse.json(report);
}
