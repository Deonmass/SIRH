import { NextResponse } from "next/server";
import { createSanteVisiteSignedUrl } from "@/lib/supabase/sante-visite-storage";
import { isSupabaseStorageConfigured } from "@/lib/supabase";

export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref")?.trim();
  if (!ref) {
    return NextResponse.json({ error: "ref requis" }, { status: 400 });
  }

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json({ error: "Stockage non configuré" }, { status: 503 });
  }

  try {
    const url = await createSanteVisiteSignedUrl(ref);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fichier indisponible";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
