// ============================================================
// MATCHPOINT — RAG Retrieval Service
// ============================================================

import type {
  IRetrievalService,
  IEmbeddingProvider,
  IVectorStore,
  RetrievalQuery,
  RetrievalResult,
} from "./types";

export class RetrievalService implements IRetrievalService {
  constructor(
    private embeddings: IEmbeddingProvider,
    private vectorStore: IVectorStore
  ) {}

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult[]> {
    const topK = query.topK || 5;
    const threshold = query.threshold || 0.7;

    // 1. Embed the query
    const queryVector = await this.embeddings.embed(query.query);

    // 2. Search the vector store
    const results = await this.vectorStore.query(
      queryVector,
      topK,
      query.filters as Record<string, unknown> | undefined
    );

    // 3. Filter by threshold
    return results.filter((r) => r.score >= threshold);
  }
}
