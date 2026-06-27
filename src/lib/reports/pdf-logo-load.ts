import { readFileSync } from "fs";
import { join } from "path";
import { isExternalLogoUrl } from "@/lib/company-logo";

export type PdfLogoImage = {
  base64: string;
  format: "PNG" | "JPEG" | "WEBP";
  dataUri: string;
  /** Largeur source en pixels */
  width: number;
  /** Hauteur source en pixels */
  height: number;
};

/** Taille d'affichage (mm) en conservant le ratio d'aspect — équivalent object-fit: contain. */
export function fitLogoBox(
  logo: PdfLogoImage,
  maxW: number,
  maxH: number
): { w: number; h: number } {
  const srcW = logo.width > 0 ? logo.width : 1;
  const srcH = logo.height > 0 ? logo.height : 1;
  const ratio = srcW / srcH;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return { w, h };
}

function readPngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function readRasterDimensions(buf: Buffer): Promise<{ width: number; height: number }> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buf).metadata();
    if (meta.width && meta.height) {
      return { width: meta.width, height: meta.height };
    }
  } catch {
    /* fallback ci-dessous */
  }
  return readPngDimensions(buf) ?? { width: 1, height: 1 };
}

function toDataUri(base64: string, format: PdfLogoImage["format"]): string {
  const mime =
    format === "JPEG" ? "image/jpeg" : format === "WEBP" ? "image/webp" : "image/png";
  return `data:${mime};base64,${base64}`;
}

function detectImageFormat(buf: Buffer): PdfLogoImage["format"] | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "PNG";
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) {
    return "JPEG";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "WEBP";
  }
  return null;
}

function isSvgBuffer(buf: Buffer): boolean {
  const head = buf.subarray(0, Math.min(buf.length, 512)).toString("utf8").trimStart();
  return head.startsWith("<svg") || head.startsWith("<?xml") || head.includes("<svg");
}

async function rasterizeSvgToPng(buf: Buffer): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buf, { density: 200 }).png().toBuffer();
  } catch {
    return null;
  }
}

async function bufferToPdfLogo(buf: Buffer): Promise<PdfLogoImage | null> {
  let raster = buf;
  if (isSvgBuffer(buf)) {
    const png = await rasterizeSvgToPng(buf);
    if (!png) return null;
    raster = png;
  }

  const format = detectImageFormat(raster);
  if (!format) return null;

  const { width, height } = await readRasterDimensions(raster);
  const base64 = raster.toString("base64");
  return { base64, format, dataUri: toDataUri(base64, format), width, height };
}

function localPathCandidates(ref: string): string[] {
  const trimmed = ref.trim();
  const withoutSlash = trimmed.replace(/^\/+/, "");
  return [
    join(process.cwd(), "public", withoutSlash),
    join(process.cwd(), withoutSlash),
    join(process.cwd(), "public", trimmed),
  ];
}

function readLocalLogoFile(ref: string): Buffer | null {
  for (const candidate of localPathCandidates(ref)) {
    try {
      return readFileSync(candidate);
    } catch {
      /* essayer le chemin suivant */
    }
  }
  return null;
}

async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Charge le logo société pour inclusion dans un PDF. */
export async function loadPdfLogoImage(
  logoRef: string | null | undefined,
  options?: { appOrigin?: string }
): Promise<PdfLogoImage | null> {
  if (typeof logoRef !== "string" || !logoRef.trim()) return null;
  const ref = logoRef.trim();

  if (isExternalLogoUrl(ref)) {
    const buf = await fetchLogoBuffer(ref);
    return buf ? bufferToPdfLogo(buf) : null;
  }

  if (ref.startsWith("/uploads/") || ref.startsWith("uploads/")) {
    const normalized = ref.startsWith("/") ? ref : `/${ref}`;
    const localBuf = readLocalLogoFile(normalized);
    if (localBuf) {
      const logo = await bufferToPdfLogo(localBuf);
      if (logo) return logo;
    }

    if (options?.appOrigin) {
      const remote = `${options.appOrigin.replace(/\/$/, "")}${normalized}`;
      const buf = await fetchLogoBuffer(remote);
      return buf ? bufferToPdfLogo(buf) : null;
    }
  }

  return null;
}

export function pickCompanyLogoUrl(
  ...candidates: (string | null | undefined)[]
): string | undefined {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
