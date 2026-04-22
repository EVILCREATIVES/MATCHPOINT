// ============================================================
// MATCHPOINT — PostgreSQL pgvector Store
// ============================================================
// Uses PostgreSQL with pgvector extension for vector similarity
// search. Falls back to InMemoryVectorStore for dev/testing.
// ============================================================

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sourceChunks, sources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { IVectorStore, EmbeddingVector, RetrievalResult } from "./types";

export class PgVectorStore implements IVectorStore {
  async upsert(vectors: EmbeddingVector[]): Promise<void> {
    for (const v of vectors) {
      const vectorStr = `[${v.vector.join(",")}]`;
      await db
        .update(sourceChunks)
        .set({
          embedding: sql`${vectorStr}::vector`,
          embeddingId: v.id,
        })
        .where(eq(sourceChunks.id, v.id));
    }
    // populate tsvector for any chunk whose content_tsv is missing
    const ids = vectors.map((v) => `'${v.id}'`).join(",");
    if (ids) {
      await db.execute(sql`
        UPDATE source_chunks
        SET content_tsv = to_tsvector('english', coalesce(content, ''))
        WHERE id IN (${sql.raw(ids)})
      `);
    }
  }

  async query(
    vector: number[],
    topK: number,
    filters?: Record<string, unknown>
  ): Promise<RetrievalResult[]> {
    const vectorStr = `[${vector.join(",")}]`;
    const filterCondition = buildFilterCondition(filters, sql`sc.embedding IS NOT NULL`);

    const results = await db.execute(sql`
      SELECT
        sc.id as chunk_id,
        sc.content,
        sc.source_id,
        sc.page_number,
        sc.kind,
        s.title as source_title,
        sc.metadata,
        1 - (sc.embedding <=> ${sql.raw(`'${vectorStr}'`)}::vector) as score
      FROM source_chunks sc
      JOIN sources s ON s.id = sc.source_id
      WHERE ${filterCondition}
        AND s.status = 'active'
        AND s.ingestion_state = 'completed'
      ORDER BY sc.embedding <=> ${sql.raw(`'${vectorStr}'`)}::vector
      LIMIT ${topK}
    `);

    return mapRows(results);
  }

  async keywordQuery(
    text: string,
    topK: number,
    filters?: Record<string, unknown>
  ): Promise<RetrievalResult[]> {
    const filterCondition = buildFilterCondition(filters, sql`sc.content_tsv IS NOT NULL`);

    const results = await db.execute(sql`
      SELECT
        sc.id as chunk_id,
        sc.content,
        sc.source_id,
        sc.page_number,
        sc.kind,
        s.title as source_title,
        sc.metadata,
        ts_rank_cd(sc.content_tsv, plainto_tsquery('english', ${text})) as score
      FROM source_chunks sc
      JOIN sources s ON s.id = sc.source_id
      WHERE ${filterCondition}
        AND s.status = 'active'
        AND s.ingestion_state = 'completed'
        AND sc.content_tsv @@ plainto_tsquery('english', ${text})
      ORDER BY score DESC
      LIMIT ${topK}
    `);

    return mapRows(results);
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      await db
        .update(sourceChunks)
        .set({ embedding: sql`NULL`, embeddingId: null })
        .where(eq(sourceChunks.id, id));
    }
  }

  async count(): Promise<number> {
    const result = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM source_chunks WHERE embedding IS NOT NULL`
    );
    return Number((result as unknown as Record<string, unknown>[])[0]?.cnt) || 0;
  }
}

function buildFilterCondition(
  filters: Record<string, unknown> | undefined,
  base: ReturnType<typeof sql>
) {
  let cond = base;
  if (!filters) return cond;

  if (Array.isArray(filters.sourceIds) && filters.sourceIds.length > 0) {
    const ids = (filters.sourceIds as string[]).map((id) => `'${id}'`).join(",");
    cond = sql`${cond} AND sc.source_id IN (${sql.raw(ids)})`;
  }
  if (Array.isArray(filters.skillLevels) && filters.skillLevels.length > 0) {
    const levels = (filters.skillLevels as string[]).map((l) => `'${l}'`).join(",");
    cond = sql`${cond} AND s.skill_level IN (${sql.raw(levels)})`;
  }
  if (Array.isArray(filters.trustLevels) && filters.trustLevels.length > 0) {
    const levels = (filters.trustLevels as string[]).map((l) => `'${l}'`).join(",");
    cond = sql`${cond} AND s.trust_level IN (${sql.raw(levels)})`;
  }
  if (Array.isArray(filters.categoryIds) && filters.categoryIds.length > 0) {
    const ids = (filters.categoryIds as string[]).map((id) => `'${id}'`).join(",");
    cond = sql`${cond} AND s.category_id IN (${sql.raw(ids)})`;
  }
  if (Array.isArray(filters.kinds) && filters.kinds.length > 0) {
    const kinds = (filters.kinds as string[]).map((k) => `'${k}'`).join(",");
    cond = sql`${cond} AND sc.kind IN (${sql.raw(kinds)})`;
  }
  return cond;
}

function mapRows(results: unknown): RetrievalResult[] {
  return (results as unknown as Record<string, unknown>[]).map((row) => ({
    chunkId: row.chunk_id as string,
    content: row.content as string,
    score: Number(row.score) || 0,
    sourceId: row.source_id as string,
    sourceTitle: row.source_title as string,
    metadata: (row.metadata as Record<string, unknown>) || {},
    pageNumber: row.page_number as number | undefined,
    kind: row.kind as string | undefined,
  }));
}

// Keep InMemoryVectorStore for testing/development
export class InMemoryVectorStore implements IVectorStore {
  private vectors: Map<string, EmbeddingVector> = new Map();

  async upsert(vectors: EmbeddingVector[]): Promise<void> {
    for (const v of vectors) {
      this.vectors.set(v.id, v);
    }
  }

  async query(
    vector: number[],
    topK: number,
    _filters?: Record<string, unknown>
  ): Promise<RetrievalResult[]> {
    const results: { id: string; score: number; vec: EmbeddingVector }[] = [];
    for (const [id, stored] of this.vectors) {
      const score = this.cosineSimilarity(vector, stored.vector);
      results.push({ id, score, vec: stored });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK).map((r) => ({
      chunkId: r.id,
      content: (r.vec.metadata.content as string) || "",
      score: r.score,
      sourceId: (r.vec.metadata.sourceId as string) || "",
      sourceTitle: (r.vec.metadata.sourceTitle as string) || "",
      metadata: r.vec.metadata,
    }));
  }

  async keywordQuery(
    text: string,
    topK: number,
    _filters?: Record<string, unknown>
  ): Promise<RetrievalResult[]> {
    const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
    const scored: { id: string; score: number; vec: EmbeddingVector }[] = [];
    for (const [id, stored] of this.vectors) {
      const content = String(stored.metadata.content || "").toLowerCase();
      let score = 0;
      for (const t of terms) if (content.includes(t)) score += 1;
      if (score > 0) scored.push({ id, score, vec: stored });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((r) => ({
      chunkId: r.id,
      content: (r.vec.metadata.content as string) || "",
      score: r.score,
      sourceId: (r.vec.metadata.sourceId as string) || "",
      sourceTitle: (r.vec.metadata.sourceTitle as string) || "",
      metadata: r.vec.metadata,
    }));
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.vectors.delete(id);
    }
  }

  async count(): Promise<number> {
    return this.vectors.size;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dotProduct / denominator;
  }
}
