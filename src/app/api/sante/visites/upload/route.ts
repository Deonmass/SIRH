import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessSection, isAdminUsername } from "@/lib/permissions";
import { getHopitalVisiteById } from "@/lib/repositories/hopital-visite";
import { isSupabaseStorageConfigured } from "@/lib/supabase";
import { uploadSanteVisiteFile } from "@/lib/supabase/sante-visite-storage";

const MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function isAllowedFile(file: File): boolean {
  return (
    ALLOWED_TYPES.includes(file.type) ||
    Boolean(file.name.match(/\.(pdf|jpe?g|png|webp|docx?)$/i))
  );
}

function canUpload(session: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>) {
  if (isAdminUsername(session.username)) return true;
  return (
    canAccessSection(session.permissions, "sante.formulaire", "write", session.username) ||
    canAccessSection(session.permissions, "sante.file-attente", "write", session.username)
  );
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!canUpload(session)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stockage Supabase non configuré. Ajoutez SUPABASE_SERVICE_ROLE_KEY et exécutez la migration 033.",
      },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const visiteId = (formData.get("visiteId") as string | null)?.trim();
  const file = formData.get("file") as File | null;

  if (!visiteId || !file) {
    return NextResponse.json({ error: "visiteId et fichier requis" }, { status: 400 });
  }

  const visite = await getHopitalVisiteById(visiteId);
  if (!visite) {
    return NextResponse.json({ error: "Visite introuvable" }, { status: 404 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  }

  if (!isAllowedFile(file)) {
    return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 400 });
  }

  try {
    const uploaded = await uploadSanteVisiteFile({
      visiteKey: visiteId,
      file,
      fileName: file.name,
      contentType: file.type || undefined,
    });
    return NextResponse.json(uploaded);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
