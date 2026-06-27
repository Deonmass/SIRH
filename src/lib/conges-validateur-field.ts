/** Encode validateur + date dans validateur_1 / validateur_2 (TEXT). */

const SEP = "|";

export function encodeValidatorField(userId: string, validatedAt: string): string {
  return `${userId}${SEP}${validatedAt}`;
}

export function parseValidatorField(raw: string | null | undefined): {
  userId: string;
  validatedAt: string | null;
} {
  if (!raw?.trim()) return { userId: "", validatedAt: null };
  const idx = raw.indexOf(SEP);
  if (idx === -1) return { userId: raw.trim(), validatedAt: null };
  return {
    userId: raw.slice(0, idx).trim(),
    validatedAt: raw.slice(idx + 1).trim() || null,
  };
}

export function toDbValidatorField(
  userId: string | null | undefined,
  validatedAt: string | null | undefined
): string | null {
  if (!userId?.trim()) return null;
  if (validatedAt) return encodeValidatorField(userId.trim(), validatedAt);
  return userId.trim();
}

export function isValidatorApproved(raw: string | null | undefined): boolean {
  const { userId, validatedAt } = parseValidatorField(raw);
  return Boolean(userId && validatedAt);
}
