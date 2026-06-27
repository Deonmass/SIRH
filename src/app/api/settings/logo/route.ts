import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isValidCompanyLogoRef } from "@/lib/company-logo";
import {
  getSettings,
  getSettingsBundle,
  saveConfigurationSection,
} from "@/lib/store";

const LOGO_DIR = path.join(process.cwd(), "public", "uploads", "company");
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);

function localLogoPath(logoUrl: string): string {
  return path.join(process.cwd(), "public", logoUrl.replace(/^\/+/, ""));
}

async function removeLocalLogoFile(logoUrl: string | null | undefined) {
  if (!logoUrl?.startsWith("/uploads/company/")) return;
  await fs.unlink(localLogoPath(logoUrl)).catch(() => undefined);
}

async function persistEntrepriseLogo(companyLogoUrl: string | null) {
  const settings = await getSettings();
  await saveConfigurationSection("entreprise", {
    ...settings,
    companyLogoUrl: companyLogoUrl ?? undefined,
  });
  return getSettingsBundle();
}

async function storeLogoBuffer(buffer: Buffer, ext: string): Promise<string> {
  await fs.mkdir(LOGO_DIR, { recursive: true });

  let outBuffer = buffer;
  let outExt = ext === "jpg" ? "jpg" : ext || "png";

  if (ext === "svg" || buffer.subarray(0, 200).toString("utf8").includes("<svg")) {
    try {
      const sharp = (await import("sharp")).default;
      outBuffer = await sharp(buffer, { density: 200 }).png().toBuffer();
      outExt = "png";
    } catch {
      throw new Error("Impossible de convertir le SVG — utilisez PNG ou JPEG");
    }
  }

  const storedName = `logo-${Date.now()}.${outExt}`;
  await fs.writeFile(path.join(LOGO_DIR, storedName), outBuffer);
  return `/uploads/company/${storedName}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Logo trop volumineux (max 2 Mo)" }, { status: 400 });
  }

  const ext = file.name.match(/\.(jpe?g|png|webp|svg)$/i)?.[1]?.toLowerCase();
  const typeOk =
    ALLOWED_TYPES.has(file.type) || Boolean(ext && ["jpeg", "jpg", "png", "webp", "svg"].includes(ext));
  if (!typeOk) {
    return NextResponse.json(
      { error: "Format non autorisé (JPEG, PNG, WebP, SVG)" },
      { status: 400 }
    );
  }

  const settings = await getSettings();
  await removeLocalLogoFile(settings.companyLogoUrl);

  const buffer = Buffer.from(await file.arrayBuffer());
  let companyLogoUrl: string;
  try {
    companyLogoUrl = await storeLogoBuffer(buffer, ext ?? "png");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec du téléversement";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const bundle = await persistEntrepriseLogo(companyLogoUrl);
  return NextResponse.json({ companyLogoUrl, ...bundle });
}

/** Enregistre une URL externe (http/https) comme logo */
export async function PATCH(request: Request) {
  const body = (await request.json()) as { url?: string };
  const url = body.url?.trim() ?? "";

  if (!isValidCompanyLogoRef(url) || url.startsWith("/uploads/")) {
    return NextResponse.json(
      { error: "URL invalide — utilisez http:// ou https://" },
      { status: 400 }
    );
  }

  const settings = await getSettings();
  await removeLocalLogoFile(settings.companyLogoUrl);

  const bundle = await persistEntrepriseLogo(url);
  return NextResponse.json({ companyLogoUrl: url, ...bundle });
}

export async function DELETE() {
  const settings = await getSettings();
  await removeLocalLogoFile(settings.companyLogoUrl);
  const bundle = await persistEntrepriseLogo(null);
  return NextResponse.json(bundle);
}
