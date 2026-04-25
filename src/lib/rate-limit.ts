// ============================================================
// MATCHPOINT — Lightweight in-memory rate limiter
// ============================================================
// Token-bucket-ish fixed window per (key, bucket) tuple.
// NOTE: in-memory means per-process. On Vercel this is per-lambda
// instance — best-effort defense against brute force / abuse, not
// a hard guarantee. For a stronger guarantee swap in Upstash Redis
// or @vercel/kv with the same `rateLimit()` signature.
// ============================================================

import { NextRequest, NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map doesn't grow unbounded.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

export interface RateLimitOptions {
  /** Logical bucket name (e.g. "auth:login"). */
  bucket: string;
  /** Identifier — typically an IP, email, or userId. */
  key: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const id = `${opts.bucket}:${opts.key}`;
  const existing = buckets.get(id);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    buckets.set(id, { count: 1, resetAt });
    return {
      ok: true,
      remaining: opts.limit - 1,
      resetAt,
      retryAfterSec: 0,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, opts.limit - existing.count);
  const ok = existing.count <= opts.limit;
  return {
    ok,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSec: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Best-effort client IP extraction. Falls back to "unknown". */
export function clientIp(request: NextRequest | Request): string {
  const h = request.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return (
    h.get("x-real-ip") ??
    h.get("cf-connecting-ip") ??
    h.get("fly-client-ip") ??
    "unknown"
  );
}

/** Build a 429 JSON response with standard headers. */
export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      error: "Too many requests",
      retryAfterSec: result.retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}
