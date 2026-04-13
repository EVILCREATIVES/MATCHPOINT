// ============================================================
// MATCHPOINT — RAG Module Barrel Export
// ============================================================

export * from "./types";
export { SimpleTextChunker } from "./chunker";
export { GeminiEmbeddingProvider, PlaceholderEmbeddingProvider } from "./embeddings";
export { PgVectorStore, InMemoryVectorStore } from "./vector-store";
export { RetrievalService } from "./retrieval";
export { PdfDocumentParser } from "./parser";
export { IngestionPipeline } from "./pipeline";
