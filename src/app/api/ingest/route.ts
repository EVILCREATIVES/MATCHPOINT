import { NextRequest, NextResponse } from "next/server";
import {
  IngestionPipeline,
  PdfDocumentParser,
  SimpleTextChunker,
  GeminiEmbeddingProvider,
  PgVectorStore,
  GeminiDocumentAnalyzer,
  QueryCache,
} from "@/lib/rag";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";

export const maxDuration = 300;

const ingestSchema = z.object({
  sourceId: z.string().uuid(),
  reprocess: z.boolean().optional(),
});

function buildPipeline() {
  return new IngestionPipeline(
    new PdfDocumentParser(),
    new SimpleTextChunker(),
    new GeminiEmbeddingProvider(),
    new PgVectorStore(),
    new GeminiDocumentAnalyzer(),
    new QueryCache()
  );
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { sourceId, reprocess } = ingestSchema.parse(body);

    const pipeline = buildPipeline();

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
