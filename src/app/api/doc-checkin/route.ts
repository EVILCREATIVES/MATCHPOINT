import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { docCheckins, exerciseLibrary, userProfiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { getRegion, fullRegionName } from "@/lib/doc-checkin/regions";
import { generateBodyAdvice, type CuratedExercise } from "@/lib/ai/doc-checkin";

export const maxDuration = 60;

const bodySchema = z.object({
  regionId: z.string().min(1).max(100),
  side: z.enum(["left", "right", "center"]).default("center"),
  view: z.enum(["front", "back"]).default("front"),
  layer: z.enum(["muscle", "skeleton"]).default("muscle"),
  gender: z.string().max(20).optional(),
  painLevel: z.number().int().min(0).max(10),
  painType: z.string().max(50).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const region = getRegion(data.regionId);
    if (!region) {
      return NextResponse.json({ error: "Unknown body region" }, { status: 400 });
    }

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    // Curated exercises whose body_regions array contains this region id.
    const curatedRows = await db
      .select()
      .from(exerciseLibrary)
      .where(
        and(
          eq(exerciseLibrary.isActive, true),
          sql`${exerciseLibrary.bodyRegions} @> ${JSON.stringify([data.regionId])}::jsonb`
        )
      )
      .limit(12);

    const curated: CuratedExercise[] = curatedRows.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      category: e.category,
      bodyRegions: (e.bodyRegions as string[]) ?? [],
      mediaUrl: e.mediaUrl,
      mediaType: e.mediaType,
    }));

    const advice = await generateBodyAdvice({
      regionId: data.regionId,
      side: data.side,
      layer: data.layer,
      painLevel: data.painLevel,
      painType: data.painType ?? null,
      notes: data.notes ?? null,
      profile: {
        name: user.name,
        age: profile?.age ?? null,
        gender: profile?.gender ?? null,
        physicalLimitations: profile?.physicalLimitations ?? null,
        fitnessLevel: profile?.fitnessLevel ?? null,
        tennisLevel: profile?.tennisLevel ?? null,
        dominantHand: profile?.dominantHand ?? null,
        yearsPlaying: profile?.yearsPlaying ?? null,
      },
      curated,
    });

    const regionLabel = fullRegionName(data.regionId, data.side, data.layer);

    const [saved] = await db
      .insert(docCheckins)
      .values({
        userId: user.id,
        view: data.view,
        layer: data.layer,
        gender: data.gender ?? profile?.gender ?? null,
        region: data.regionId,
        regionLabel,
        side: data.side,
        painLevel: data.painLevel,
        painType: data.painType ?? null,
        notes: data.notes ?? null,
        aiResponse: advice as unknown as Record<string, unknown>,
      })
      .returning({ id: docCheckins.id, createdAt: docCheckins.createdAt });

    return NextResponse.json({
      id: saved.id,
      createdAt: saved.createdAt,
      regionLabel,
      advice,
    });
  } catch (error) {
    console.error("Doc check-in failed:", error);
    return NextResponse.json(
      {
        error: "Doc check-in failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(docCheckins)
      .where(eq(docCheckins.userId, user.id))
      .orderBy(desc(docCheckins.createdAt))
      .limit(30);

    return NextResponse.json({
      checkins: rows.map((r) => ({
        id: r.id,
        region: r.region,
        regionLabel: r.regionLabel,
        side: r.side,
        view: r.view,
        layer: r.layer,
        painLevel: r.painLevel,
        painType: r.painType,
        notes: r.notes,
        advice: r.aiResponse,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Doc check-in history failed:", error);
    return NextResponse.json(
      { error: "Failed to load history" },
      { status: 500 }
    );
  }
}
