import { cookies } from "next/headers";
import type { PermissionMatrix } from "@/lib/permissions";
import { hydrateSessionUser } from "./hydrate-session";

export const SESSION_COOKIE = "sirh-session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 jours

/** Identité stockée dans le cookie (sans permissions — limite navigateur ~4 Ko). */
export type SessionIdentity = {
  id: number;
  username: string;
  matriculAgent: string | null;
};

export type SessionUser = SessionIdentity & {
  permissions: PermissionMatrix;
};

type SessionPayload = SessionIdentity & {
  exp: number;
};

function authSecret(): string {
  return process.env.AUTH_SECRET?.trim() || "sirh-dev-secret-change-in-production";
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function utf8ToBase64Url(value: string): string {
  return base64UrlEncode(new TextEncoder().encode(value));
}

function base64UrlToUtf8(encoded: string): string {
  return new TextDecoder().decode(base64UrlDecode(encoded));
}

let cachedHmacKey: CryptoKey | null = null;
let cachedHmacSecret: string | null = null;

async function getHmacKey(): Promise<CryptoKey> {
  const secret = authSecret();
  if (cachedHmacKey && cachedHmacSecret === secret) return cachedHmacKey;
  cachedHmacKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  cachedHmacSecret = secret;
  return cachedHmacKey;
}

async function signPayload(encoded: string): Promise<string> {
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  return base64UrlEncode(new Uint8Array(signature));
}

async function verifyPayload(encoded: string, signature: string): Promise<boolean> {
  try {
    const key = await getHmacKey();
    const sigBytes = base64UrlDecode(signature);
    return await crypto.subtle.verify(
      "HMAC",
      key,
      new Uint8Array(sigBytes),
      new TextEncoder().encode(encoded)
    );
  } catch {
    return false;
  }
}

async function encodeSession(payload: SessionPayload): Promise<string> {
  const encoded = utf8ToBase64Url(JSON.stringify(payload));
  return `${encoded}.${await signPayload(encoded)}`;
}

async function decodeSession(token: string): Promise<SessionPayload | null> {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  try {
    if (!(await verifyPayload(encoded, signature))) return null;
    const payload = JSON.parse(base64UrlToUtf8(encoded)) as SessionPayload;
    if (!payload?.id || !payload.username || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSessionToken(identity: SessionIdentity): Promise<string> {
  const payload: SessionPayload = {
    id: identity.id,
    username: identity.username,
    matriculAgent: identity.matriculAgent ?? null,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  };
  return encodeSession(payload);
}

export async function parseSessionToken(
  token: string | undefined | null
): Promise<SessionIdentity | null> {
  if (!token) return null;
  const payload = await decodeSession(token);
  if (!payload) return null;
  return {
    id: payload.id,
    username: payload.username,
    matriculAgent: payload.matriculAgent ?? null,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const identity = await parseSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!identity) return null;
  return hydrateSessionUser(identity);
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

export function clearSessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}
