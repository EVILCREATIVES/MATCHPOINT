import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { practiceSessions, videoAnalyses } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await requireUser();

  const [session] = await db
    .select({ id: practiceSessions.id })
    .from(practiceSessions)
    .where(
      and(eq(practiceSessions.id, id), eq(practiceSessions.userId, user.id))
    )
    .limit(1);

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Collect blob URLs for cleanup before deleting rows.
  const takes = await db
    .select({ id: videoAnalyses.id, blobUrl: videoAnalyses.blobUrl })
    .from(videoAnalyses)
    .where(eq(videoAnalyses.sessionId, id));

  await db.delete(videoAnalyses).where(eq(videoAnalyses.sessionId, id));
  await db.delete(practiceSessions).where(eq(practiceSessions.id, id));

  // Best-effort blob cleanup.
  await Promise.allSettled(takes.map((t) => del(t.blobUrl)));

  return NextResponse.json({ ok: true, deleted: takes.length });
}
