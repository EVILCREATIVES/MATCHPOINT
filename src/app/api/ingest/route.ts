import { NextRequest, NextResponse } from "next/server";
import { IngestionPipeline } from "@/lib/rag/pipeline";
import { PdfDocumentParser } from "@/lib/rag/parser";
import { SimpleTextChunker } from "@/lib/rag/chunker";
import { GeminiEmbeddingProvider } from "@/lib/rag/embeddings";
import { PgVectorStore } from "@/lib/rag/vector-store";
import { z } from "zod";

const ingestSchema = z.object({
  sourceId: z.string().uuid(),
  reprocess: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, reprocess } = ingestSchema.parse(body);

    const pipeline = new IngestionPipeline(
      new PdfDocumentParser(),
      new SimpleTextChunker(),
      new GeminiEmbeddingProvider(),
      new PgVectorStore()
    );

    const result = reprocess
      ? await pipeline.reprocess(sourceId)
      : await pipeline.ingest(sourceId);

    return NextResponse.json({
      success: true,
      sourceId,
      chunksCreated: result.chunksCreated,
    });
  } catch (error) {
    console.error("Ingestion failed:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Ingestion failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
