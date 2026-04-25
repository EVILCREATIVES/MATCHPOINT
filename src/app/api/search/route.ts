import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  HybridRetrievalService,
  GeminiEmbeddingProvider,
  PgVectorStore,
  GeminiReranker,
  QueryCache,
} from "@/lib/rag";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const searchSchema = z.object({
  query: z.string().min(2).max(500),
  topK: z.number().int().min(1).max(20).optional(),
  rerank: z.boolean().optional(),
  skillLevels: z.array(z.string()).optional(),
});

let svc: HybridRetrievalService | null = null;
function getService() {
  if (!svc) {
    svc = new HybridRetrievalService(
      new GeminiEmbeddingProvider(),
      new PgVectorStore(),
      new GeminiReranker(),
      new QueryCache()
    );
  }
  return svc;
}

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const body = await request.json();
    const data = searchSchema.parse(body);

    const results = await getService().retrieve({
      query: data.query,
      topK: data.topK ?? 8,
      rerank: data.rerank ?? true,
      filters: data.skillLevels?.length ? { skillLevels: data.skillLevels } : undefined,
    });

    return NextResponse.json({
      query: data.query,
      results: results.map((r) => ({
        chunkId: r.chunkId,
        sourceId: r.sourceId,
        sourceTitle: r.sourceTitle,
        content: r.content,
        score: r.score,
        pageNumber: r.pageNumber,
        kind: r.kind,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Search failed:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
