// Shared server-side runner used by both the upload `after()` hook and the
// /api/videos/[id]/analyze endpoint, so we don't depend on cookie forwarding
// across an internal HTTP roundtrip.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { videoAnalyses, userProfiles } from "@/lib/db/schema";
import { analyzeVideo } from "@/lib/ai/video-analyzer";

export async function runVideoAnalysis(videoId: string): Promise<void> {
  const [video] = await db
    .select()
    .from(videoAnalyses)
    .where(eq(videoAnalyses.id, videoId))
    .limit(1);

  if (!video) {
    console.error("[runVideoAnalysis] video not found:", videoId);
    return;
  }
  if (video.status === "completed") return;

  await db
    .update(videoAnalyses)
    .set({ status: "processing", errorMessage: null })
    .where(eq(videoAnalyses.id, videoId));

  const [profile] = await db
    .select({
      tennisLevel: userProfiles.tennisLevel,
      yearsPlaying: userProfiles.yearsPlaying,
      dominantHand: userProfiles.dominantHand,
      currentGoals: userProfiles.currentGoals,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, video.userId))
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
      .where(eq(videoAnalyses.id, videoId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    console.error("[runVideoAnalysis] failed for", videoId, err);
    await db
      .update(videoAnalyses)
      .set({ status: "failed", errorMessage: msg.slice(0, 500) })
      .where(eq(videoAnalyses.id, videoId));
  }
}
