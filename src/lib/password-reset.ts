// ============================================================
// MATCHPOINT — Password reset token helpers
// ============================================================
// Tokens are random 32-byte values, base64url-encoded for the URL.
// Only their SHA-256 hash is stored in the DB, so a DB leak does
// not let an attacker mint reset URLs. Tokens expire in 1 hour and
// are single-use.
// ============================================================

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashResetToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(token));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function tokenExpiresAt(): Date {
  return new Date(Date.now() + TOKEN_TTL_MS);
}
