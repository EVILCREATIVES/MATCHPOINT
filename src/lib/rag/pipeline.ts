// ============================================================
// MATCHPOINT — Ingestion Pipeline (two-pass)
// ============================================================
// Pass 1 — Fast text path:
//   PDF → text + per-page → semantic chunks → embeddings → pgvector + tsvector.
// Pass 2 — Structured analysis (LLM, optional but on by default):
//   Whole PDF → Gemini → structured tennis knowledge
//   (techniques, common errors, drills, progressions, figures)
//   + auto-fill source title / author / summary / tags / skill level / category.
// ============================================================

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  sources,
  sourceChunks,
  ingestionJobs,
  techniques,
  commonErrors,
  drills,
  progressions,
  sourceFigures,
  categories,
} from "@/lib/db/schema";
import type {
  IIngestionPipeline,
  IDocumentParser,
  ITextChunker,
  IEmbeddingProvider,
  IVectorStore,
  IDocumentAnalyzer,
  IQueryCache,
  DocumentAnalysis,
  ParsedDocument,
} from "./types";

interface PipelineOptions {
  analyze?: boolean; // run pass 2 (default true)
}

export class IngestionPipeline implements IIngestionPipeline {
  constructor(
    private parser: IDocumentParser,
    private chunker: ITextChunker,
    private embeddings: IEmbeddingProvider,
    private vectorStore: IVectorStore,
    private analyzer?: IDocumentAnalyzer,
    private cache?: IQueryCache
  ) {}

  async ingest(sourceId: string, options: PipelineOptions = {}): Promise<{ chunksCreated: number }> {
    const runAnalysis = options.analyze !== false && Boolean(this.analyzer);

    const [job] = await db
      .insert(ingestionJobs)
      .values({ sourceId, status: "processing", startedAt: new Date() })
      .returning();

    await db
      .update(sources)
      .set({ ingestionState: "processing", errorMessage: null })
      .where(eq(sources.id, sourceId));

    try {
      const [source] = await db
        .select()
        .from(sources)
        .where(eq(sources.id, sourceId))
        .limit(1);

      if (!source) throw new Error(`Source not found: ${sourceId}`);
      if (!source.sourceUrl) throw new Error(`Source has no URL: ${sourceId}`);

      // Download from Vercel Blob (public URL with unguessable suffix)
      const response = await fetch(source.sourceUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to download file from ${source.sourceUrl}: ${response.status} ${response.statusText}`
        );
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = source.sourceType === "pdf" ? "application/pdf" : "text/plain";

      // Pass 1 — text path (parse + chunk + embed + store)
      const parsed = await this.parser.parse(buffer, mimeType);
      const textChunks = this.chunker.chunk(parsed.content, { pages: parsed.pages });

      if (textChunks.length === 0) {
        throw new Error("No text chunks extracted from document");
      }

      const insertedTextChunks = await db
        .insert(sourceChunks)
        .values(
          textChunks.map((chunk, index) => ({
            sourceId,
            content: chunk.content,
            chunkIndex: index,
            tokenCount: chunk.tokenCount,
            kind: chunk.kind ?? "text",
            pageNumber: chunk.pageNumber,
            headingPath: chunk.headingPath ?? [],
            metadata: {
              ...chunk.metadata,
              pageCount: parsed.pageCount,
              sourceTitle: source.title,
            },
          }))
        )
        .returning();

      // Pass 2 — structured analysis (parallel with embedding)
      const analysisPromise: Promise<DocumentAnalysis | null> = runAnalysis
        ? this.analyzer!.analyze({ buffer, mimeType, filename: source.title }).catch((err) => {
            console.warn("Analyzer failed, continuing without structured data:", err);
            return null;
          })
        : Promise.resolve(null);

      // Embed text chunks (run in parallel with analysis)
      const embedPromise = (async () => {
        const texts = insertedTextChunks.map((c) => c.content);
        const vectors = await this.embeddings.embedBatch(texts);
        await this.vectorStore.upsert(
          insertedTextChunks.map((chunk, i) => ({
            id: chunk.id,
            vector: vectors[i],
            metadata: {
              content: chunk.content,
              sourceId,
              sourceTitle: source.title,
              chunkIndex: chunk.chunkIndex,
            },
          }))
        );
      })();

      const [analysis] = await Promise.all([analysisPromise, embedPromise]);

      let totalChunks = insertedTextChunks.length;

      // Persist structured knowledge + figures + auto-fill source metadata
      if (analysis) {
        const figureChunks = await this.persistAnalysis(sourceId, source.title, analysis);
        if (figureChunks.length > 0) {
          // embed figure chunks too
          const figVectors = await this.embeddings.embedBatch(figureChunks.map((c) => c.content));
          await this.vectorStore.upsert(
            figureChunks.map((chunk, i) => ({
              id: chunk.id,
              vector: figVectors[i],
              metadata: {
                content: chunk.content,
                sourceId,
                sourceTitle: source.title,
                chunkIndex: chunk.chunkIndex,
                kind: "figure",
              },
            }))
          );
          totalChunks += figureChunks.length;
        }
        await this.applySourceMetadata(sourceId, source, parsed, analysis, totalChunks);
      } else {
        await db
          .update(sources)
          .set({
            ingestionState: "completed",
            chunkCount: totalChunks,
            pageCount: parsed.pageCount ?? null,
            summary: parsed.title || `Processed ${totalChunks} chunks from ${source.title}`,
            updatedAt: new Date(),
          })
          .where(eq(sources.id, sourceId));
      }

      await db
        .update(ingestionJobs)
        .set({
          status: "completed",
          completedAt: new Date(),
          chunksCreated: totalChunks,
          metadata: { analyzed: Boolean(analysis) },
        })
        .where(eq(ingestionJobs.id, job.id));

      // Bust the RAG cache so new content is searchable immediately
      if (this.cache) {
        await this.cache.invalidateAll().catch(() => undefined);
      }

      return { chunksCreated: totalChunks };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

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
    // Delete existing chunks, structured rows, figures
    await db.delete(sourceFigures).where(eq(sourceFigures.sourceId, sourceId));
    await db.delete(sourceChunks).where(eq(sourceChunks.sourceId, sourceId));
    await db.delete(techniques).where(eq(techniques.sourceId, sourceId));
    await db.delete(commonErrors).where(eq(commonErrors.sourceId, sourceId));
    await db.delete(drills).where(eq(drills.sourceId, sourceId));
    await db.delete(progressions).where(eq(progressions.sourceId, sourceId));

    await db
      .update(sources)
      .set({
        ingestionState: "reprocessing",
        chunkCount: 0,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(sources.id, sourceId));

    return this.ingest(sourceId);
  }

  // ── helpers ──

  private async persistAnalysis(
    sourceId: string,
    sourceTitle: string,
    analysis: DocumentAnalysis
  ): Promise<Array<{ id: string; content: string; chunkIndex: number }>> {
    if (analysis.techniques.length > 0) {
      await db.insert(techniques).values(
        analysis.techniques.map((t) => ({
          sourceId,
          name: t.name,
          category: t.category ?? null,
          skillLevel: t.skillLevel ?? null,
          description: t.description,
          keyPoints: t.keyPoints,
          tags: t.tags,
        }))
      );
    }
    if (analysis.commonErrors.length > 0) {
      await db.insert(commonErrors).values(
        analysis.commonErrors.map((e) => ({
          sourceId,
          techniqueName: e.techniqueName ?? null,
          errorName: e.errorName,
          description: e.description,
          cause: e.cause ?? null,
          fix: e.fix ?? null,
          skillLevel: e.skillLevel ?? null,
          tags: e.tags,
        }))
      );
    }
    if (analysis.drills.length > 0) {
      await db.insert(drills).values(
        analysis.drills.map((d) => ({
          sourceId,
          name: d.name,
          focus: d.focus ?? null,
          skillLevel: d.skillLevel ?? null,
          description: d.description,
          setup: d.setup ?? null,
          instructions: d.instructions,
          durationMinutes: d.durationMinutes ?? null,
          equipment: d.equipment,
          tags: d.tags,
        }))
      );
    }
    if (analysis.progressions.length > 0) {
      await db.insert(progressions).values(
        analysis.progressions.map((p) => ({
          sourceId,
          name: p.name,
          goal: p.goal,
          skillLevel: p.skillLevel ?? null,
          steps: p.steps,
          durationWeeks: p.durationWeeks ?? null,
          tags: p.tags,
        }))
      );
    }

    // Insert figures both as a row and as searchable chunks
    if (analysis.figures.length === 0) return [];

    const baseIndex =
      ((
        await db.execute(
          sql`SELECT COALESCE(MAX(chunk_index), -1) + 1 AS next FROM source_chunks WHERE source_id = ${sourceId}`
        )
      )[0] as { next: number } | undefined)?.next ?? 0;

    const figureChunkRows = await db
      .insert(sourceChunks)
      .values(
        analysis.figures.map((f, i) => ({
          sourceId,
          content: `Figure: ${f.caption}\n${f.description}`,
          chunkIndex: baseIndex + i,
          tokenCount: estimateTokens(`${f.caption} ${f.description}`),
          kind: "figure" as const,
          pageNumber: f.pageNumber ?? null,
          headingPath: [],
          metadata: { caption: f.caption, sourceTitle },
        }))
      )
      .returning({ id: sourceChunks.id, content: sourceChunks.content, chunkIndex: sourceChunks.chunkIndex });

    await db.insert(sourceFigures).values(
      analysis.figures.map((f, i) => ({
        sourceId,
        chunkId: figureChunkRows[i].id,
        pageNumber: f.pageNumber ?? null,
        caption: f.caption,
        description: f.description,
        metadata: {},
      }))
    );

    return figureChunkRows;
  }

  private async applySourceMetadata(
    sourceId: string,
    source: typeof sources.$inferSelect,
    parsed: ParsedDocument,
    analysis: DocumentAnalysis,
    totalChunks: number
  ): Promise<void> {
    const categoryId = analysis.categorySlug
      ? await ensureCategory(analysis.categorySlug)
      : source.categoryId;

    const looksAutoTitled =
      !source.title ||
      source.title.toLowerCase().endsWith(".pdf") ||
      source.title.startsWith("Untitled");

    const newTitle = analysis.title && looksAutoTitled ? analysis.title : source.title;

    await db
      .update(sources)
      .set({
        title: newTitle,
        author: analysis.author ?? source.author,
        summary: analysis.summary ?? source.summary,
        skillLevel: analysis.skillLevel ?? source.skillLevel,
        tags: dedupe([...(source.tags ?? []), ...analysis.tags]),
        categoryId,
        language: analysis.language ?? source.language,
        pageCount: parsed.pageCount ?? source.pageCount,
        chunkCount: totalChunks,
        ingestionState: "completed",
        analysisVersion: (source.analysisVersion ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(sources.id, sourceId));
  }
}

async function ensureCategory(slug: string): Promise<string | null> {
  const cleaned = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  if (!cleaned) return null;

  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, cleaned))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const [created] = await db
    .insert(categories)
    .values({
      name: cleaned.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      slug: cleaned,
    })
    .returning({ id: categories.id });
  return created?.id ?? null;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
  }
  return out;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length / 0.75);
}
