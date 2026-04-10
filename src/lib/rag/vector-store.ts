// ============================================================
// MATCHPOINT — Placeholder Vector Store
// ============================================================
// In-memory vector store for development. Replace with:
// - Pinecone
// - Supabase pgvector
// - Weaviate
// - Qdrant
// - ChromaDB
// when deploying to production.
// ============================================================

import type { IVectorStore, EmbeddingVector, RetrievalResult } from "./types";

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
