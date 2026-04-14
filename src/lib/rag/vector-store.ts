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
  }

  async query(
    vector: number[],
    topK: number,
    filters?: Record<string, unknown>
  ): Promise<RetrievalResult[]> {
    const vectorStr = `[${vector.join(",")}]`;

    // Build filter conditions
    let filterCondition = sql`sc.embedding IS NOT NULL`;

    if (filters?.sourceIds && Array.isArray(filters.sourceIds) && filters.sourceIds.length > 0) {
      const ids = filters.sourceIds.map((id: string) => `'${id}'`).join(",");
      filterCondition = sql`${filterCondition} AND sc.source_id IN (${sql.raw(ids)})`;
    }

    if (filters?.skillLevels && Array.isArray(filters.skillLevels) && filters.skillLevels.length > 0) {
      const levels = filters.skillLevels.map((l: string) => `'${l}'`).join(",");
      filterCondition = sql`${filterCondition} AND s.skill_level IN (${sql.raw(levels)})`;
    }

    if (filters?.trustLevels && Array.isArray(filters.trustLevels) && filters.trustLevels.length > 0) {
      const levels = filters.trustLevels.map((l: string) => `'${l}'`).join(",");
      filterCondition = sql`${filterCondition} AND s.trust_level IN (${sql.raw(levels)})`;
    }

    const results = await db.execute(sql`
      SELECT
        sc.id as chunk_id,
        sc.content,
        sc.source_id,
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

    return (results as unknown as Record<string, unknown>[]).map((row) => ({
      chunkId: row.chunk_id as string,
      content: row.content as string,
      score: row.score as number,
      sourceId: row.source_id as string,
      sourceTitle: row.source_title as string,
      metadata: (row.metadata as Record<string, unknown>) || {},
    }));
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
