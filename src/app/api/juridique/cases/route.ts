import { NextResponse } from "next/server";
import { createLegalCase, listLegalCases } from "@/lib/legal-cases-store";
import { loadLegalArticlesServer } from "@/lib/legal-articles-server";

export async function GET() {
  const cases = await listLegalCases();
  return NextResponse.json(cases);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    status?: "open" | "in_progress" | "resolved";
  };
  if (!body.description?.trim()) {
    return NextResponse.json({ error: "La description du cas est requise." }, { status: 400 });
  }
  const articles = await loadLegalArticlesServer();
  const legalCase = await createLegalCase({
    title: body.title ?? "Nouveau cas",
    description: body.description,
    articles,
    status: body.status,
  });
  return NextResponse.json(legalCase, { status: 201 });
}
