// ============================================================
// MATCHPOINT — RAG Query Cache
// ============================================================
// Persists normalized query → retrieved chunk IDs (and an
// optional final answer) in Postgres so repeated questions can
// skip embedding + retrieval + generation.
// ============================================================

import { createHash } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { queryCache } from "@/lib/db/schema";
import type { IQueryCache } from "./types";

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export class QueryCache implements IQueryCache {
  async get(
    query: string,
    filters: Record<string, unknown> | undefined
  ): Promise<{ chunkIds: string[]; answer?: string; embedding?: number[] } | null> {
    const queryHash = hashQuery(query);
    const filterHash = hashFilters(filters);

    const rows = await db.execute(sql`
      SELECT id, chunk_ids, answer, embedding, expires_at
      FROM query_cache
      WHERE query_hash = ${queryHash} AND filter_hash = ${filterHash}
      LIMIT 1
    `);
    const row = (rows as unknown as Record<string, unknown>[])[0];
    if (!row) return null;

    if (row.expires_at && new Date(row.expires_at as string) < new Date()) {
      // expired — drop it
      await db.delete(queryCache).where(eq(queryCache.id, row.id as string));
      return null;
    }

    // bump hit counter
    await db.execute(sql`UPDATE query_cache SET hits = hits + 1 WHERE id = ${row.id as string}`);

    return {
      chunkIds: Array.isArray(row.chunk_ids) ? (row.chunk_ids as string[]) : [],
      answer: typeof row.answer === "string" ? row.answer : undefined,
      embedding: parseVector(row.embedding),
    };
  }

  async set(
    query: string,
    filters: Record<string, unknown> | undefined,
    payload: { chunkIds: string[]; answer?: string; embedding?: number[]; ttlSeconds?: number }
  ): Promise<void> {
    const queryHash = hashQuery(query);
    const filterHash = hashFilters(filters);
    const ttl = payload.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const embeddingStr = payload.embedding ? `[${payload.embedding.join(",")}]` : null;

    await db.execute(sql`
      INSERT INTO query_cache (query_hash, query_text, filter_hash, embedding, chunk_ids, answer, expires_at)
      VALUES (
        ${queryHash},
        ${query},
        ${filterHash},
        ${embeddingStr ? sql`${embeddingStr}::vector` : sql`NULL`},
        ${JSON.stringify(payload.chunkIds)}::jsonb,
        ${payload.answer ?? null},
        ${expiresAt}
      )
      ON CONFLICT (query_hash) DO UPDATE SET
        filter_hash = EXCLUDED.filter_hash,
        embedding = EXCLUDED.embedding,
        chunk_ids = EXCLUDED.chunk_ids,
        answer = EXCLUDED.answer,
        expires_at = EXCLUDED.expires_at
    `);
  }

  async invalidateAll(): Promise<void> {
    await db.delete(queryCache);
  }
}

function hashQuery(query: string): string {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized).digest("hex");
}

function hashFilters(filters: Record<string, unknown> | undefined): string {
  if (!filters) return "none";
  const sorted = JSON.stringify(filters, Object.keys(filters).sort());
  return createHash("sha256").update(sorted).digest("hex");
}

function parseVector(value: unknown): number[] | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("[")) return undefined;
  return value.slice(1, -1).split(",").map(Number);
}
