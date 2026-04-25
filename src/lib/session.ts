// ============================================================
// MATCHPOINT — Session cookie helpers
// ============================================================
// Minimal signed-cookie auth. Payload is base64url JSON, signed with
// HMAC-SHA256 using AUTH_SECRET. Compatible with Node + Edge runtimes
// (uses Web Crypto for HMAC so it works in middleware).
// ============================================================

import { cookies } from "next/headers";

const COOKIE_NAME = "mp_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  userId: string;
  role: "admin" | "user";
  iat: number; // issued-at, seconds since epoch
}

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "AUTH_SECRET must be set to a strong random string (>= 16 chars)"
    );
  }
  return s;
}

function b64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function encodeSession(payload: SessionPayload): Promise<string> {
  const json = JSON.stringify(payload);
  const body = b64urlEncode(new TextEncoder().encode(json));
  const sig = await hmac(getSecret(), body);
  return `${body}.${b64urlEncode(sig)}`;
}

export async function decodeSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  try {
    const expected = await hmac(getSecret(), body);
    if (!timingSafeEqual(b64urlDecode(sig), expected)) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as SessionPayload;
    if (!payload.userId || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  return decodeSession(token);
}

export async function setSession(payload: Omit<SessionPayload, "iat">): Promise<void> {
  const token = await encodeSession({ ...payload, iat: Math.floor(Date.now() / 1000) });
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
