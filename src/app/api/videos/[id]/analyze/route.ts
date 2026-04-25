import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { videoAnalyses, userProfiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { analyzeVideo } from "@/lib/ai/video-analyzer";

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await requireUser();

  const [video] = await db
    .select()
    .from(videoAnalyses)
    .where(and(eq(videoAnalyses.id, id), eq(videoAnalyses.userId, user.id)))
    .limit(1);

  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (video.status === "completed") {
    return NextResponse.json({ ok: true, status: video.status });
  }

  // Mark as processing.
  await db
    .update(videoAnalyses)
    .set({ status: "processing", errorMessage: null })
    .where(eq(videoAnalyses.id, id));

  const [profile] = await db
    .select({
      tennisLevel: userProfiles.tennisLevel,
      yearsPlaying: userProfiles.yearsPlaying,
      dominantHand: userProfiles.dominantHand,
      currentGoals: userProfiles.currentGoals,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);

  try {
    const result = await analyzeVideo({
      blobUrl: video.blobUrl,
      mimeType: video.mimeType,
      strokeType: video.strokeType,
      notes: video.notes,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profile: (profile as any) ?? null,
    });

    await db
      .update(videoAnalyses)
      .set({
        status: "completed",
        feedback: result.feedback,
        rubricScores: result.rubricScores,
        keyTakeaways: result.keyTakeaways,
        drillSuggestions: result.drillSuggestions,
        completedAt: new Date(),
      })
      .where(eq(videoAnalyses.id, id));

    return NextResponse.json({ ok: true, status: "completed" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    console.error("Video analysis failed:", err);
    await db
      .update(videoAnalyses)
      .set({ status: "failed", errorMessage: msg.slice(0, 500) })
      .where(eq(videoAnalyses.id, id));
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
