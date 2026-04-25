import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { videoAnalyses } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "video/mp4",
  "video/quicktime", // .mov
  "video/webm",
]);
const ALLOWED_STROKES = new Set([
  "forehand",
  "backhand",
  "serve",
  "volley",
  "return",
  "other",
]);

export async function POST(request: NextRequest) {
  const user = await requireUser();

  // 5 uploads / 10 min per user — videos are expensive on every leg.
  const rl = rateLimit({
    bucket: "video:upload",
    key: user.id,
    limit: 5,
    windowMs: 10 * 60_000,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const strokeType = String(formData.get("strokeType") ?? "").toLowerCase();
  const notes = (formData.get("notes") as string | null) ?? null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only MP4, MOV, or WebM videos are allowed." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_SIZE_MB} MB limit (Gemini inline cap).` },
      { status: 400 }
    );
  }
  if (!ALLOWED_STROKES.has(strokeType)) {
    return NextResponse.json({ error: "Invalid stroke type." }, { status: 400 });
  }

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");

  const blob = await put(`videos/${user.id}/${Date.now()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  const [row] = await db
    .insert(videoAnalyses)
    .values({
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      blobUrl: blob.url,
      blobPath: blob.pathname,
      strokeType,
      notes: notes?.slice(0, 1000) ?? null,
      status: "pending",
    })
    .returning();

  // Kick off analysis (non-blocking, server-to-server with cookie forwarding).
  void triggerAnalysis(request, row.id);

  return NextResponse.json({ id: row.id, status: row.status });
}

async function triggerAnalysis(request: NextRequest, id: string) {
  try {
    const origin = new URL(request.url).origin;
    await fetch(`${origin}/api/videos/${id}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
    });
  } catch (err) {
    console.error("Failed to trigger video analysis for", id, err);
  }
}
