import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import {
  sources,
  sourceChunks,
  sourceFigures,
  ingestionJobs,
  techniques,
  commonErrors,
  drills,
  progressions,
} from "@/lib/db/schema";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    const [source] = await db
      .select()
      .from(sources)
      .where(eq(sources.id, id))
      .limit(1);

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Delete child rows first (no ON DELETE CASCADE on these FKs).
    // We delete rather than null so we don't leave orphaned structured
    // knowledge — it's regenerable by re-ingesting the source anyway.
    await db.delete(sourceFigures).where(eq(sourceFigures.sourceId, id));
    await db.delete(sourceChunks).where(eq(sourceChunks.sourceId, id));
    await db.delete(ingestionJobs).where(eq(ingestionJobs.sourceId, id));
    await db.delete(techniques).where(eq(techniques.sourceId, id));
    await db.delete(commonErrors).where(eq(commonErrors.sourceId, id));
    await db.delete(drills).where(eq(drills.sourceId, id));
    await db.delete(progressions).where(eq(progressions.sourceId, id));

    // Best-effort: remove the underlying blob (PDF). Don't fail the
    // delete if the blob is already gone.
    if (source.sourceType === "pdf" && source.sourceUrl) {
      try {
        await del(source.sourceUrl);
      } catch (err) {
        console.warn("Blob delete failed (continuing):", err);
      }
    }

    await db.delete(sources).where(eq(sources.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete source:", error);
    return NextResponse.json(
      {
        error: "Failed to delete source",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
