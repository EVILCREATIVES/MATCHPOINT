import { NextRequest, NextResponse, after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { videoAnalyses } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { runVideoAnalysis } from "@/lib/ai/run-video-analysis";

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await requireUser();

  const [video] = await db
    .select({ id: videoAnalyses.id, status: videoAnalyses.status })
    .from(videoAnalyses)
    .where(and(eq(videoAnalyses.id, id), eq(videoAnalyses.userId, user.id)))
    .limit(1);

  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Flip to processing immediately so the UI updates on refresh.
  await db
    .update(videoAnalyses)
    .set({ status: "processing", errorMessage: null })
    .where(eq(videoAnalyses.id, id));

  // Run analysis after the response is sent so the user gets a fast ack.
  after(async () => {
    await runVideoAnalysis(id);
  });

  return NextResponse.json({ ok: true, status: "processing" });
}
