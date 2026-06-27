import { NextResponse } from "next/server";
import { getPayslipTemplate, savePayslipTemplate } from "@/lib/store";
import type { PayslipTemplateConfig } from "@/lib/types";

export async function GET() {
  const template = await getPayslipTemplate();
  return NextResponse.json(template);
}

export async function PUT(request: Request) {
  const body = (await request.json()) as PayslipTemplateConfig;
  const saved = await savePayslipTemplate(body);
  return NextResponse.json(saved);
}
