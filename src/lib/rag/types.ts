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
  pages?: ParsedPage[];
}

export interface ParsedPage {
  pageNumber: number;
  content: string;
}

export interface TextChunk {
  content: string;
  index: number;
  tokenCount: number;
  kind?: "text" | "figure" | "table" | "heading" | "summary";
  pageNumber?: number;
  headingPath?: string[];
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
  pageNumber?: number;
  kind?: string;
}

export interface RetrievalQuery {
  query: string;
  topK?: number;
  threshold?: number;
  rerank?: boolean;
  useCache?: boolean;
  filters?: {
    categoryIds?: string[];
    skillLevels?: string[];
    trustLevels?: string[];
    sourceIds?: string[];
    tags?: string[];
    kinds?: string[];
  };
}

export interface DocumentAnalysis {
  title?: string;
  author?: string;
  summary?: string;
  language?: string;
  skillLevel?: "beginner" | "intermediate" | "advanced" | "elite";
  categorySlug?: string;
  tags: string[];
  techniques: AnalyzedTechnique[];
  commonErrors: AnalyzedError[];
  drills: AnalyzedDrill[];
  progressions: AnalyzedProgression[];
  figures: AnalyzedFigure[];
}

export interface AnalyzedTechnique {
  name: string;
  category?: string;
  skillLevel?: "beginner" | "intermediate" | "advanced" | "elite";
  description: string;
  keyPoints: string[];
  tags: string[];
}

export interface AnalyzedError {
  techniqueName?: string;
  errorName: string;
  description: string;
  cause?: string;
  fix?: string;
  skillLevel?: "beginner" | "intermediate" | "advanced" | "elite";
  tags: string[];
}

export interface AnalyzedDrill {
  name: string;
  focus?: string;
  skillLevel?: "beginner" | "intermediate" | "advanced" | "elite";
  description: string;
  setup?: string;
  instructions: string[];
  durationMinutes?: number;
  equipment: string[];
  tags: string[];
}

export interface AnalyzedProgression {
  name: string;
  goal: string;
  skillLevel?: "beginner" | "intermediate" | "advanced" | "elite";
  steps: Array<{ order: number; title: string; description: string }>;
  durationWeeks?: number;
  tags: string[];
}

export interface AnalyzedFigure {
  pageNumber?: number;
  caption: string;
  description: string;
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
  keywordQuery(text: string, topK: number, filters?: Record<string, unknown>): Promise<RetrievalResult[]>;
  delete(ids: string[]): Promise<void>;
  count(): Promise<number>;
}

export interface IReranker {
  rerank(query: string, results: RetrievalResult[], topN: number): Promise<RetrievalResult[]>;
}

export interface IDocumentAnalyzer {
  analyze(input: { buffer: Buffer; mimeType: string; filename?: string }): Promise<DocumentAnalysis>;
}

export interface IQueryCache {
  get(query: string, filters: Record<string, unknown> | undefined): Promise<{
    chunkIds: string[];
    answer?: string;
    embedding?: number[];
  } | null>;
  set(query: string, filters: Record<string, unknown> | undefined, payload: {
    chunkIds: string[];
    answer?: string;
    embedding?: number[];
    ttlSeconds?: number;
  }): Promise<void>;
  invalidateAll(): Promise<void>;
}

export interface IRetrievalService {
  retrieve(query: RetrievalQuery): Promise<RetrievalResult[]>;
}

export interface IIngestionPipeline {
  ingest(sourceId: string): Promise<{ chunksCreated: number }>;
  reprocess(sourceId: string): Promise<{ chunksCreated: number }>;
}
