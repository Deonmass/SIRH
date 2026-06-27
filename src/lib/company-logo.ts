/** Valide une URL de logo (http/https) ou un chemin local /uploads/… */
export function isValidCompanyLogoRef(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/uploads/")) return true;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isExternalLogoUrl(value: string | undefined): boolean {
  return Boolean(value?.trim().startsWith("http://") || value?.trim().startsWith("https://"));
}

export function companyLogoDisplaySrc(
  logoUrl: string | undefined,
  assetBaseUrl?: string
): string | null {
  if (!logoUrl?.trim()) return null;
  const trimmed = logoUrl.trim();
  if (isExternalLogoUrl(trimmed)) return trimmed;
  if (trimmed.startsWith("/uploads/")) {
    const base = assetBaseUrl?.replace(/\/$/, "") ?? "";
    return `${base}${trimmed}`;
  }
  return null;
}
