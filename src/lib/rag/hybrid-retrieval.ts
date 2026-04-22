// ============================================================
// MATCHPOINT — Hybrid RAG Retrieval Service
// ============================================================
// Combines pgvector semantic search and Postgres tsvector keyword
// search via Reciprocal Rank Fusion (RRF), optionally re-ranks
// the top candidates with Gemini, and caches results.
// ============================================================

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type {
  IRetrievalService,
  IEmbeddingProvider,
  IVectorStore,
  IReranker,
  IQueryCache,
  RetrievalQuery,
  RetrievalResult,
} from "./types";

const RRF_K = 60;
const VECTOR_POOL = 30;
const KEYWORD_POOL = 30;
const FUSED_POOL = 30;

export class HybridRetrievalService implements IRetrievalService {
  constructor(
    private embeddings: IEmbeddingProvider,
    private vectorStore: IVectorStore,
    private reranker?: IReranker,
    private cache?: IQueryCache
  ) {}

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult[]> {
    const topK = query.topK ?? 8;
    const useCache = query.useCache !== false;
    const filters = query.filters as Record<string, unknown> | undefined;

    // 1. Try cache
    if (useCache && this.cache) {
      const hit = await this.cache.get(query.query, filters);
      if (hit && hit.chunkIds.length > 0) {
        const cached = await this.loadChunksByIds(hit.chunkIds);
        if (cached.length > 0) return cached.slice(0, topK);
      }
    }

    // 2. Run vector + keyword searches in parallel
    const [vectorResults, keywordResults] = await Promise.all([
      this.embeddings.embed(query.query).then((v) =>
        this.vectorStore.query(v, VECTOR_POOL, filters)
      ),
      this.vectorStore.keywordQuery(query.query, KEYWORD_POOL, filters),
    ]);

    // 3. Fuse with Reciprocal Rank Fusion
    const fused = reciprocalRankFusion([vectorResults, keywordResults], FUSED_POOL);

    // 4. Optional rerank with Gemini
    let finalResults = fused;
    if (query.rerank !== false && this.reranker && fused.length > topK) {
      finalResults = await this.reranker.rerank(query.query, fused, topK);
    } else {
      finalResults = fused.slice(0, topK);
    }

    // 5. Apply optional score threshold (only meaningful for vector path)
    if (typeof query.threshold === "number") {
      const threshold = query.threshold;
      finalResults = finalResults.filter((r) => r.score >= threshold || r.score === 0);
    }

    // 6. Cache the final chunk IDs (no answer yet)
    if (useCache && this.cache && finalResults.length > 0) {
      await this.cache
        .set(query.query, filters, { chunkIds: finalResults.map((r) => r.chunkId) })
        .catch(() => {
          /* cache failures must not break retrieval */
        });
    }

    return finalResults;
  }

  private async loadChunksByIds(ids: string[]): Promise<RetrievalResult[]> {
    if (ids.length === 0) return [];
    const inList = ids.map((id) => `'${id}'`).join(",");
    const rows = await db.execute(sql`
      SELECT
        sc.id as chunk_id,
        sc.content,
        sc.source_id,
        sc.page_number,
        sc.kind,
        s.title as source_title,
        sc.metadata
      FROM source_chunks sc
      JOIN sources s ON s.id = sc.source_id
      WHERE sc.id IN (${sql.raw(inList)})
        AND s.status = 'active'
        AND s.ingestion_state = 'completed'
    `);

    const byId = new Map<string, RetrievalResult>();
    for (const row of rows as unknown as Record<string, unknown>[]) {
      byId.set(row.chunk_id as string, {
        chunkId: row.chunk_id as string,
        content: row.content as string,
        score: 1,
        sourceId: row.source_id as string,
        sourceTitle: row.source_title as string,
        metadata: (row.metadata as Record<string, unknown>) || {},
        pageNumber: row.page_number as number | undefined,
        kind: row.kind as string | undefined,
      });
    }
    return ids.map((id) => byId.get(id)).filter((r): r is RetrievalResult => Boolean(r));
  }
}

function reciprocalRankFusion(
  lists: RetrievalResult[][],
  topN: number
): RetrievalResult[] {
  const scores = new Map<string, { score: number; result: RetrievalResult }>();
  for (const list of lists) {
    list.forEach((result, rank) => {
      const contribution = 1 / (RRF_K + rank + 1);
      const existing = scores.get(result.chunkId);
      if (existing) {
        existing.score += contribution;
      } else {
        scores.set(result.chunkId, { score: contribution, result });
      }
    });
  }
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((entry) => ({ ...entry.result, score: entry.score }));
}

// Backward-compatible alias for code still importing the old class.
export { HybridRetrievalService as RetrievalService };
