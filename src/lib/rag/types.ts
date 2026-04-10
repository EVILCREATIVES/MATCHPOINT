// ============================================================
// MATCHPOINT — RAG Pipeline Abstractions
// ============================================================
// These interfaces define the contract for RAG operations.
// Implementations can be swapped (e.g., different vector DBs,
// different embedding providers) without changing app code.
// ============================================================

export interface ParsedDocument {
  content: string;
  metadata: Record<string, unknown>;
  pageCount?: number;
  title?: string;
}

export interface TextChunk {
  content: string;
  index: number;
  tokenCount: number;
  metadata: Record<string, unknown>;
}

export interface EmbeddingVector {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

export interface RetrievalResult {
  chunkId: string;
  content: string;
  score: number;
  sourceId: string;
  sourceTitle: string;
  metadata: Record<string, unknown>;
}

export interface RetrievalQuery {
  query: string;
  topK?: number;
  threshold?: number;
  filters?: {
    categoryIds?: string[];
    skillLevels?: string[];
    trustLevels?: string[];
    sourceIds?: string[];
    tags?: string[];
  };
}

// ── Service Interfaces ──

export interface IDocumentParser {
  parse(input: Buffer | string, mimeType: string): Promise<ParsedDocument>;
  supportedTypes(): string[];
}

export interface ITextChunker {
  chunk(text: string, options?: { chunkSize?: number; overlap?: number }): TextChunk[];
}

export interface IEmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  modelName(): string;
  dimensions(): number;
}

export interface IVectorStore {
  upsert(vectors: EmbeddingVector[]): Promise<void>;
  query(vector: number[], topK: number, filters?: Record<string, unknown>): Promise<RetrievalResult[]>;
  delete(ids: string[]): Promise<void>;
  count(): Promise<number>;
}

export interface IRetrievalService {
  retrieve(query: RetrievalQuery): Promise<RetrievalResult[]>;
}

export interface IIngestionPipeline {
  ingest(sourceId: string): Promise<{ chunksCreated: number }>;
  reprocess(sourceId: string): Promise<{ chunksCreated: number }>;
}
