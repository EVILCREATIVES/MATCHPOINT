import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";

export const maxDuration = 60;

const MAX_SIZE_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB || "50", 10);
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES = ["application/pdf"];

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF files are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File size exceeds ${MAX_SIZE_MB} MB limit` },
      { status: 400 }
    );
  }

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");

  // 1. Store the PDF in Vercel Blob.
  // Note: @vercel/blob v2 only supports `access: "public"`. URLs contain an
  // unguessable random suffix, which is the standard Vercel Blob pattern.
  const blob = await put(`sources/${Date.now()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  // 2. Auto-create the source row (title/author/etc. will be auto-filled by ingestion)
  const placeholderTitle = file.name.replace(/\.pdf$/i, "").trim() || safeName;
  const [source] = await db
    .insert(sources)
    .values({
      title: placeholderTitle,
      sourceType: "pdf",
      sourceUrl: blob.url,
      filePath: blob.pathname,
      fileSize: file.size,
      ingestionState: "pending",
      visibility: "private",
      trustLevel: "unreviewed",
    })
    .returning();

  // 3. Kick off ingestion in the background — don't block the upload response
  void triggerIngestion(request, source.id);

  return NextResponse.json({
    url: blob.url,
    pathname: blob.pathname,
    size: file.size,
    filename: file.name,
    sourceId: source.id,
    ingestionState: source.ingestionState,
  });
}

async function triggerIngestion(request: NextRequest, sourceId: string) {
  try {
    const origin = new URL(request.url).origin;
    await fetch(`${origin}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
  } catch (error) {
    console.error("Failed to trigger ingestion for", sourceId, error);
  }
}
