import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keyLen: 64 } as const;

/** Hache un mot de passe (format `scrypt$salt$hash`). */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, SCRYPT_PARAMS.keyLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  }).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (!plain || !stored) return false;

  if (stored.startsWith("scrypt$")) {
    const [, salt, hash] = stored.split("$");
    if (!salt || !hash) return false;
    const derived = scryptSync(plain, salt, SCRYPT_PARAMS.keyLen, {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p,
    });
    const expected = Buffer.from(hash, "hex");
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(expected, derived);
  }

  /** Compatibilité dev : mot de passe stocké en clair (migration locale). */
  return timingSafeEqual(Buffer.from(plain), Buffer.from(stored));
}

/** Hash léger pour le compte Admin par défaut en seed SQL/local. */
export function hashPasswordLegacySha256(plain: string): string {
  return `sha256$${createHash("sha256").update(plain).digest("hex")}`;
}

export function verifyPasswordWithLegacy(plain: string, stored: string): boolean {
  if (stored.startsWith("sha256$")) {
    const expected = stored.slice("sha256$".length);
    const actual = createHash("sha256").update(plain).digest("hex");
    return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
  }
  return verifyPassword(plain, stored);
}
