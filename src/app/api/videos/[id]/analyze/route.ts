import { NextRequest, NextResponse } from "next/server";
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

  // Run analysis INLINE on retry so the error surfaces in the response.
  // (The initial upload uses after() to keep the upload roundtrip fast.)
  await runVideoAnalysis(id);

  // Re-read so we can return whatever state the runner left us in.
  const [after] = await db
    .select({ status: videoAnalyses.status, errorMessage: videoAnalyses.errorMessage })
    .from(videoAnalyses)
    .where(eq(videoAnalyses.id, id))
    .limit(1);

  if (after?.status === "failed") {
    return NextResponse.json(
      { error: after.errorMessage || "Analysis failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, status: after?.status ?? "unknown" });
}
