import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { videoAnalyses } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await requireUser();

  const [video] = await db
    .select({ id: videoAnalyses.id, blobUrl: videoAnalyses.blobUrl })
    .from(videoAnalyses)
    .where(and(eq(videoAnalyses.id, id), eq(videoAnalyses.userId, user.id)))
    .limit(1);

  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(videoAnalyses).where(eq(videoAnalyses.id, id));

  // Best-effort blob cleanup; don't fail the request if the blob is already gone.
  try {
    await del(video.blobUrl);
  } catch (err) {
    console.warn("Blob delete failed for video", id, err);
  }

  return NextResponse.json({ ok: true });
}
