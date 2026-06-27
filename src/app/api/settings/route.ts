import { NextResponse } from "next/server";
import { getSettingsBundle, updateSettings } from "@/lib/store";
import type { AppSettings } from "@/lib/types";

export async function GET() {
  const bundle = await getSettingsBundle();
  return NextResponse.json(bundle);
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Partial<AppSettings>;
  await updateSettings(body);
  const bundle = await getSettingsBundle();
  return NextResponse.json(bundle);
}
