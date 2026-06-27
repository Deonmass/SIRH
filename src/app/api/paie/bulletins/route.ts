import { NextResponse } from "next/server";
import { generatePayslips, type PayslipScope } from "@/lib/payslip-engine";
import { renderPayslipHtml } from "@/lib/payslip-html";
import {
  archivePayslipsToDossiers,
  getDatabase,
  getPayslipTemplate,
  getSettings,
} from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    period: string;
    scope: PayslipScope;
    department?: string;
    employeeId?: string;
    archive?: boolean;
  };

  const { period, scope, department, employeeId, archive } = body;
  if (!period || !scope) {
    return NextResponse.json({ error: "Période et périmètre requis" }, { status: 400 });
  }

  const db = await getDatabase();
  const settings = await getSettings();
  const template = await getPayslipTemplate();
  const payslips = generatePayslips(db, settings, period, scope, {
    department,
    employeeId,
  });

  const htmlByEmployeeId: Record<string, string> = {};
  const assetBaseUrl = new URL(request.url).origin;
  for (const slip of payslips) {
    htmlByEmployeeId[slip.employeeId] = renderPayslipHtml(slip, template, settings, {
      assetBaseUrl,
    });
  }

  let archiveResult = { archived: 0, errors: [] as string[] };
  if (archive && payslips.length > 0) {
    archiveResult = await archivePayslipsToDossiers(payslips, htmlByEmployeeId);
  }

  return NextResponse.json({
    count: payslips.length,
    payslips,
    htmlByEmployeeId,
    archived: archiveResult.archived,
    archiveErrors: archiveResult.errors,
  });
}
