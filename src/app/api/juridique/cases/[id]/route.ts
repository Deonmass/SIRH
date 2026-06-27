import { NextResponse } from "next/server";
import {
  deleteLegalCase,
  getLegalCase,
  updateLegalCase,
} from "@/lib/legal-cases-store";
import { loadLegalArticlesServer } from "@/lib/legal-articles-server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const legalCase = await getLegalCase(id);
  if (!legalCase) {
    return NextResponse.json({ error: "Cas introuvable." }, { status: 404 });
  }
  return NextResponse.json(legalCase);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    status?: "open" | "in_progress" | "resolved";
    reanalyze?: boolean;
  };
  const articles = await loadLegalArticlesServer();
  const legalCase = await updateLegalCase(id, {
    title: body.title,
    description: body.description,
    status: body.status,
    articles,
    reanalyze: body.reanalyze === true,
  });
  if (!legalCase) {
    return NextResponse.json({ error: "Cas introuvable." }, { status: 404 });
  }
  return NextResponse.json(legalCase);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const ok = await deleteLegalCase(id);
  if (!ok) {
    return NextResponse.json({ error: "Cas introuvable." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
