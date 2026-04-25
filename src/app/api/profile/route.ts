import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfiles, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

const profileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  age: z.number().int().min(5).max(120).nullable().optional(),
  gender: z.string().max(50).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  timezone: z.string().max(100).nullable().optional(),
  tennisLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]),
  yearsPlaying: z.number().int().min(0).max(80),
  dominantHand: z.enum(["left", "right", "ambidextrous"]),
  fitnessLevel: z.enum(["low", "moderate", "high", "athletic"]),
  currentGoals: z.array(z.string()).default([]),
  availableTrainingDays: z.number().int().min(1).max(7),
  availableMinutesPerSession: z.number().int().min(15).max(360),
  hasCourtAccess: z.boolean().default(false),
  hasCoachAccess: z.boolean().default(false),
  hasBallMachine: z.boolean().default(false),
  physicalLimitations: z.string().max(1000).nullable().optional(),
  preferredLearningStyle: z.enum(["visual", "reading", "kinesthetic", "mixed"]),
  preferredPlanIntensity: z.enum(["light", "moderate", "intense", "elite"]),
});

export async function GET() {
  const user = await requireUser();
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);
  return NextResponse.json({ user, profile: profile ?? null });
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const data = profileSchema.parse(body);

    if (data.name && data.name !== user.name) {
      await db
        .update(users)
        .set({ name: data.name, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    const [existing] = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    const values = {
      userId: user.id,
      age: data.age ?? null,
      gender: data.gender ?? null,
      country: data.country ?? null,
      timezone: data.timezone ?? null,
      tennisLevel: data.tennisLevel,
      yearsPlaying: data.yearsPlaying,
      dominantHand: data.dominantHand,
      fitnessLevel: data.fitnessLevel,
      currentGoals: data.currentGoals,
      availableTrainingDays: data.availableTrainingDays,
      availableMinutesPerSession: data.availableMinutesPerSession,
      hasCourtAccess: data.hasCourtAccess,
      hasCoachAccess: data.hasCoachAccess,
      hasBallMachine: data.hasBallMachine,
      physicalLimitations: data.physicalLimitations ?? null,
      preferredLearningStyle: data.preferredLearningStyle,
      preferredPlanIntensity: data.preferredPlanIntensity,
      onboardingCompleted: true,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(userProfiles).set(values).where(eq(userProfiles.id, existing.id));
    } else {
      await db.insert(userProfiles).values(values);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
