// ============================================================
// MATCHPOINT — Ingestion Pipeline Implementation
// ============================================================
// Downloads PDFs from Vercel Blob, parses them, chunks text,
// generates embeddings via Gemini, and stores in pgvector.
// ============================================================

import { eq, sql } from "drizzle-orm";
import { getDownloadUrl } from "@vercel/blob";
import { db } from "@/lib/db";
import { sources, sourceChunks, ingestionJobs } from "@/lib/db/schema";
import type {
  IIngestionPipeline,
  IDocumentParser,
  ITextChunker,
  IEmbeddingProvider,
  IVectorStore,
} from "./types";

export class IngestionPipeline implements IIngestionPipeline {
  constructor(
    private parser: IDocumentParser,
    private chunker: ITextChunker,
    private embeddings: IEmbeddingProvider,
    private vectorStore: IVectorStore
  ) {}

  async ingest(sourceId: string): Promise<{ chunksCreated: number }> {
    // 1. Create ingestion job
    const [job] = await db
      .insert(ingestionJobs)
      .values({
        sourceId,
        status: "processing",
        startedAt: new Date(),
      })
      .returning();

    // 2. Update source state
    await db
      .update(sources)
      .set({ ingestionState: "processing", errorMessage: null })
      .where(eq(sources.id, sourceId));

    try {
      // 3. Fetch source record
      const [source] = await db
        .select()
        .from(sources)
        .where(eq(sources.id, sourceId))
        .limit(1);

      if (!source) throw new Error(`Source not found: ${sourceId}`);
      if (!source.sourceUrl) throw new Error(`Source has no URL: ${sourceId}`);

      // 4. Download the file from Vercel Blob (private access)
      const downloadUrl = await getDownloadUrl(source.sourceUrl);
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 5. Parse the document
      const mimeType = source.sourceType === "pdf" ? "application/pdf" : "text/plain";
      const parsed = await this.parser.parse(buffer, mimeType);

      // 6. Chunk the text
      const chunks = this.chunker.chunk(parsed.content);

      if (chunks.length === 0) {
        throw new Error("No text chunks extracted from document");
      }

      // 7. Insert chunks into DB
      const insertedChunks = await db
        .insert(sourceChunks)
        .values(
          chunks.map((chunk, index) => ({
            sourceId,
            content: chunk.content,
            chunkIndex: index,
            tokenCount: chunk.tokenCount,
            metadata: {
              ...chunk.metadata,
              pageCount: parsed.pageCount,
              sourceTitle: source.title,
            },
          }))
        )
        .returning();

      // 8. Generate embeddings in batches and store
      const chunkTexts = insertedChunks.map((c) => c.content);
      const vectors = await this.embeddings.embedBatch(chunkTexts);

      const embeddingVectors = insertedChunks.map((chunk, i) => ({
        id: chunk.id,
        vector: vectors[i],
        metadata: {
          content: chunk.content,
          sourceId,
          sourceTitle: source.title,
          chunkIndex: chunk.chunkIndex,
        },
      }));

      await this.vectorStore.upsert(embeddingVectors);

      // 9. Update source and job as completed
      await db
        .update(sources)
        .set({
          ingestionState: "completed",
          chunkCount: chunks.length,
          summary: parsed.title || `Processed ${chunks.length} chunks from ${source.title}`,
          updatedAt: new Date(),
        })
        .where(eq(sources.id, sourceId));

      await db
        .update(ingestionJobs)
        .set({
          status: "completed",
          completedAt: new Date(),
          chunksCreated: chunks.length,
        })
        .where(eq(ingestionJobs.id, job.id));

      return { chunksCreated: chunks.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Update source and job as failed
      await db
        .update(sources)
        .set({
          ingestionState: "failed",
          errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(sources.id, sourceId));

      await db
        .update(ingestionJobs)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorMessage,
        })
        .where(eq(ingestionJobs.id, job.id));

      throw error;
    }
  }

  async reprocess(sourceId: string): Promise<{ chunksCreated: number }> {
    // Delete existing chunks for this source
    await db.delete(sourceChunks).where(eq(sourceChunks.sourceId, sourceId));

    // Reset source state
    await db
      .update(sources)
      .set({
        ingestionState: "reprocessing",
        chunkCount: 0,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(sources.id, sourceId));

    // Re-run ingestion
    return this.ingest(sourceId);
  }
}
