import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseAdminAnonClient } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error: "Variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY absentes",
      },
      { status: 503 }
    );
  }

  try {
    const supabase = createSupabaseAdminAnonClient();

    const { error: metaError } = await supabase.from("app_meta").select("id").limit(1).maybeSingle();

    if (metaError) {
      const isMissingTable =
        metaError.code === "PGRST205" ||
        metaError.message.includes("Could not find the table") ||
        metaError.message.includes("schema cache");

      return NextResponse.json({
        ok: true,
        configured: true,
        connected: true,
        schemaReady: false,
        message: isMissingTable
          ? "Connexion Supabase OK — exécutez database/migration.sql dans le SQL Editor Supabase"
          : metaError.message,
        hint: isMissingTable ? "Supabase → SQL Editor → coller database/migration.sql → Run" : undefined,
      });
    }

    const { data: meta } = await supabase.from("app_meta").select("*").eq("id", 1).maybeSingle();

    return NextResponse.json({
      ok: true,
      configured: true,
      connected: true,
      schemaReady: true,
      appMeta: meta,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        connected: false,
        error: err instanceof Error ? err.message : "Erreur de connexion",
      },
      { status: 500 }
    );
  }
}
