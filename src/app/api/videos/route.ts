import { put } from "@vercel/blob";
import { NextRequest, NextResponse, after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { videoAnalyses, practiceSessions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { runVideoAnalysis } from "@/lib/ai/run-video-analysis";

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
  let sessionCreatedAt: Date | null = null;
  if (sessionIdRaw) {
    const [sess] = await db
      .select({
        id: practiceSessions.id,
        createdAt: practiceSessions.createdAt,
      })
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
    sessionCreatedAt = sess.createdAt;
  }

  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : file.type.includes("mp4")
      ? "mp4"
      : file.type.includes("quicktime")
        ? "mov"
        : "webm";

  // Human-readable folder layout:
  //   users/{email-slug}/{YYYY-MM-DD_HH-mm}_{stroke}/take-{N}.{ext}
  // Falls back to a single dated folder for ad-hoc (non-session) uploads.
  const userSlug = (user.email.split("@")[0] || user.id)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);

  const ts = sessionCreatedAt ?? new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateSlug = `${ts.getUTCFullYear()}-${pad(ts.getUTCMonth() + 1)}-${pad(ts.getUTCDate())}_${pad(ts.getUTCHours())}-${pad(ts.getUTCMinutes())}`;

  const folder = sessionId
    ? `users/${userSlug}/${dateSlug}_${strokeType}`
    : `users/${userSlug}/uploads_${dateSlug}`;

  const baseName = sessionId && takeNumber
    ? `take-${String(takeNumber).padStart(2, "0")}.${ext}`
    : `clip-${Date.now()}.${ext}`;

  const blob = await put(`${folder}/${baseName}`, file, {
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

  // Run analysis after the response is sent. We call the analyzer directly
  // (not over HTTP) so we don't depend on internal cookie forwarding.
  after(async () => {
    await runVideoAnalysis(row.id);
  });

  return NextResponse.json({ id: row.id, status: row.status });
}
