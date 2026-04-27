// ============================================================
// MATCHPOINT — Pro Note Ingestion
// ============================================================
// Single endpoint for short-form coaching notes from pros / coaches:
// title + body text + optional images / short videos. Each note becomes
// one `source` row of type "manual"; the body is chunked + embedded
// for RAG; attached media are persisted as `sourceFigures` so they
// can be surfaced alongside the text in answers.
// ============================================================

import { put } from "@vercel/blob";
import { NextRequest, NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sources, sourceChunks, sourceFigures } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  GeminiEmbeddingProvider,
  PgVectorStore,
  SimpleTextChunker,
} from "@/lib/rag";

export const maxDuration = 60;

const MAX_FILE_MB = 25;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const MAX_FILES = 8;
const ALLOWED_MEDIA_PREFIXES = ["image/", "video/"];

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();

  const rl = rateLimit({
    bucket: "pro-notes:create",
    key: admin.id,
    limit: 20,
    windowMs: 10 * 60_000,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const author = String(form.get("author") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const tagsRaw = String(form.get("tags") ?? "").trim();
  const skillLevel = String(form.get("skillLevel") ?? "").trim() || null;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!body && !form.getAll("files").length) {
    return NextResponse.json(
      { error: "Provide text content or at least one attachment" },
      { status: 400 }
    );
  }

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Too many attachments (max ${MAX_FILES}).` },
      { status: 400 }
    );
  }
  for (const f of files) {
    if (!ALLOWED_MEDIA_PREFIXES.some((p) => f.type.startsWith(p))) {
      return NextResponse.json(
        { error: `Unsupported file type: ${f.type || "unknown"}` },
        { status: 400 }
      );
    }
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `${f.name} exceeds ${MAX_FILE_MB} MB limit` },
        { status: 400 }
      );
    }
  }

  // 1. Create the source row.
  const [source] = await db
    .insert(sources)
    .values({
      title,
      author: author || null,
      sourceType: "manual",
      visibility: "private",
      trustLevel: "trusted", // pro notes ship trusted by default
      tags,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      skillLevel: (skillLevel as any) || null,
      ingestionState: "processing",
      summary: body.slice(0, 500),
    })
    .returning();

  // 2. Upload media to blob storage.
  const folder = `pro-notes/${slugify(author || "anon")}/${source.id}`;
  const uploads = await Promise.all(
    files.map(async (f, i) => {
      const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : "bin";
      const key = `${folder}/${String(i + 1).padStart(2, "0")}-${slugify(f.name).slice(0, 60)}.${ext}`;
      const blob = await put(key, f, {
        access: "public",
        addRandomSuffix: true,
        contentType: f.type,
      });
      return {
        url: blob.url,
        pathname: blob.pathname,
        type: f.type,
        kind: f.type.startsWith("video/") ? "video" : "image",
        name: f.name,
        size: f.size,
      };
    })
  );

  // 3. Persist attachments as figures so they show up in source detail
  //    and can be surfaced with retrieval results.
  if (uploads.length > 0) {
    await db.insert(sourceFigures).values(
      uploads.map((u) => ({
        sourceId: source.id,
        chunkId: null,
        pageNumber: null,
        caption: u.name,
        description: `${u.kind} attachment from ${author || "pro note"}`,
        metadata: {
          url: u.url,
          pathname: u.pathname,
          type: u.type,
          kind: u.kind,
          size: u.size,
        },
      }))
    );
  }

  // 4. Chunk + embed the body text after the response so the request returns fast.
  after(async () => {
    try {
      await chunkEmbedAndFinalize(source.id, title, author, body, tags, uploads);
    } catch (err) {
      console.error("[pro-notes] failed to embed", source.id, err);
      await db
        .update(sources)
        .set({
          ingestionState: "failed",
          errorMessage:
            err instanceof Error ? err.message.slice(0, 500) : "Embedding failed",
        })
        .where(eq(sources.id, source.id));
    }
  });

  return NextResponse.json({ source });
}

async function chunkEmbedAndFinalize(
  sourceId: string,
  title: string,
  author: string,
  body: string,
  tags: string[],
  attachments: Array<{ url: string; kind: string; name: string }>
) {
  // Build a single text payload that includes context the model would care about.
  const attachmentLines = attachments.length
    ? `\n\nAttachments: ${attachments.map((a) => `${a.kind}:${a.name}`).join(", ")}`
    : "";
  const fullText = `# ${title}${author ? `\nAuthor: ${author}` : ""}${
    tags.length ? `\nTags: ${tags.join(", ")}` : ""
  }\n\n${body}${attachmentLines}`;

  if (!body.trim() && attachments.length === 0) {
    await db
      .update(sources)
      .set({ ingestionState: "completed", chunkCount: 0 })
      .where(eq(sources.id, sourceId));
    return;
  }

  const chunker = new SimpleTextChunker();
  const chunks = chunker.chunk(fullText);

  if (chunks.length === 0) {
    await db
      .update(sources)
      .set({ ingestionState: "completed", chunkCount: 0 })
      .where(eq(sources.id, sourceId));
    return;
  }

  const inserted = await db
    .insert(sourceChunks)
    .values(
      chunks.map((c, i) => ({
        sourceId,
        content: c.content,
        chunkIndex: i,
        tokenCount: c.tokenCount,
        kind: "text" as const,
        pageNumber: null,
        headingPath: [],
        metadata: { sourceTitle: title, author },
      }))
    )
    .returning();

  const embeddings = new GeminiEmbeddingProvider();
  const vectors = await embeddings.embedBatch(inserted.map((c) => c.content));

  const store = new PgVectorStore();
  await store.upsert(
    inserted.map((c, i) => ({
      id: c.id,
      vector: vectors[i],
      metadata: {
        content: c.content,
        sourceId,
        sourceTitle: title,
        chunkIndex: c.chunkIndex,
      },
    }))
  );

  await db
    .update(sources)
    .set({
      ingestionState: "completed",
      chunkCount: inserted.length,
      updatedAt: new Date(),
    })
    .where(eq(sources.id, sourceId));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}
