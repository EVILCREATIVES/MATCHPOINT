import { put } from "@vercel/blob";
import { NextRequest, NextResponse, after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { videoAnalyses, practiceSessions } from "@/lib/db/schema";
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

  // 30 uploads / 10 min per user — supports multi-take sessions of up to 20.
  const rl = rateLimit({
    bucket: "video:upload",
    key: user.id,
    limit: 30,
    windowMs: 10 * 60_000,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const strokeType = String(formData.get("strokeType") ?? "").toLowerCase();
  const notes = (formData.get("notes") as string | null) ?? null;
  const sessionIdRaw = (formData.get("sessionId") as string | null) ?? null;
  const takeNumberRaw = formData.get("takeNumber");
  const takeNumber = takeNumberRaw ? parseInt(String(takeNumberRaw), 10) : null;

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

  // Validate session ownership if provided.
  let sessionId: string | null = null;
  if (sessionIdRaw) {
    const [sess] = await db
      .select({ id: practiceSessions.id })
      .from(practiceSessions)
      .where(
        and(
          eq(practiceSessions.id, sessionIdRaw),
          eq(practiceSessions.userId, user.id)
        )
      )
      .limit(1);
    if (!sess) return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    sessionId = sess.id;
  }

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");

  // Group multi-take uploads into a per-session folder for tidy storage.
  const folder = sessionId
    ? `videos/${user.id}/${sessionId}`
    : `videos/${user.id}`;

  const blob = await put(`${folder}/${Date.now()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  const [row] = await db
    .insert(videoAnalyses)
    .values({
      userId: user.id,
      sessionId,
      takeNumber: takeNumber && Number.isFinite(takeNumber) ? takeNumber : null,
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

  // Kick off analysis after the response is sent — `after()` keeps the
  // serverless function alive past the response so the fetch actually runs.
  const origin = new URL(request.url).origin;
  const cookie = request.headers.get("cookie") ?? "";
  after(async () => {
    try {
      const res = await fetch(`${origin}/api/videos/${row.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
      });
      if (!res.ok) {
        console.error(
          "Analyze trigger non-OK for",
          row.id,
          res.status,
          await res.text().catch(() => "")
        );
      }
    } catch (err) {
      console.error("Failed to trigger video analysis for", row.id, err);
    }
  });

  return NextResponse.json({ id: row.id, status: row.status });
}
