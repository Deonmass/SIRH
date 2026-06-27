/** Sérialise les chemins de pièces jointes (JSON dans document_annexe). */
export function serializeMovementAttachments(paths: string[]): string | null {
  const cleaned = paths.map((p) => p.trim()).filter(Boolean);
  if (!cleaned.length) return null;
  return JSON.stringify(cleaned);
}

/** Désérialise document_annexe (JSON ou chemin unique legacy). */
export function parseMovementAttachments(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      return [trimmed];
    }
  }
  return [trimmed];
}

export function attachmentFileName(path: string): string {
  const segment = path.split("/").pop() ?? path;
  const withoutTimestamp = segment.replace(/^mvt-\d+-/, "");
  return withoutTimestamp || segment;
}
