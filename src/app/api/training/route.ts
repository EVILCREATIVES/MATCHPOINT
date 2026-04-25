import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  trainingPlans,
  trainingSessions,
  userProfiles,
} from "@/lib/db/schema";
import {
  GeminiEmbeddingProvider,
  PgVectorStore,
  HybridRetrievalService,
  GeminiReranker,
  QueryCache,
} from "@/lib/rag";
import { getAIService } from "@/lib/ai/service";
import { requireUser } from "@/lib/auth";
import type { UserProfile } from "@/types";

export const maxDuration = 120;

interface GeneratePlanBody {
  focusAreas?: string[];
  period?: "weekly" | "daily";
}

export async function GET() {
  const user = await requireUser();
  const [active] = await db
    .select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.userId, user.id), eq(trainingPlans.isActive, true)))
    .orderBy(desc(trainingPlans.createdAt))
    .limit(1);

  if (!active) return NextResponse.json({ plan: null, sessions: [] });

  const sessions = await db
    .select()
    .from(trainingSessions)
    .where(eq(trainingSessions.planId, active.id))
    .orderBy(trainingSessions.dayOfWeek, trainingSessions.sortOrder);

  return NextResponse.json({ plan: active, sessions });
}

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePlanBody = await request.json().catch(() => ({}));
    const period = body.period ?? "weekly";

    const user = await requireUser();

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found. Complete onboarding first." },
        { status: 400 }
      );
    }

    const focusAreas =
      body.focusAreas && body.focusAreas.length > 0
        ? body.focusAreas
        : (profile.currentGoals as string[] | null)?.length
          ? (profile.currentGoals as string[])
          : ["forehand", "backhand", "serve", "footwork"];

    // Pull RAG context for the focus areas
    const retrieval = new HybridRetrievalService(
      new GeminiEmbeddingProvider(),
      new PgVectorStore(),
      new GeminiReranker(),
      new QueryCache()
    );
    const context = await retrieval.retrieve({
      query: `Tennis training plan for a ${profile.tennisLevel} player. Focus: ${focusAreas.join(", ")}.`,
      topK: 8,
    });

    // Build a UserProfile object the AI service expects.
    const aiProfile: UserProfile = {
      id: profile.id,
      userId: user.id,
      age: profile.age ?? undefined,
      gender: profile.gender ?? undefined,
      country: profile.country ?? undefined,
      timezone: profile.timezone ?? undefined,
      tennisLevel: profile.tennisLevel,
      yearsPlaying: profile.yearsPlaying,
      dominantHand: profile.dominantHand as "left" | "right",
      currentGoals: (profile.currentGoals as string[]) ?? [],
      availableTrainingDays: profile.availableTrainingDays,
      availableMinutesPerSession: profile.availableMinutesPerSession,
      hasCourtAccess: profile.hasCourtAccess,
      hasCoachAccess: profile.hasCoachAccess,
      hasBallMachine: profile.hasBallMachine,
      physicalLimitations: profile.physicalLimitations ?? undefined,
      fitnessLevel: profile.fitnessLevel as UserProfile["fitnessLevel"],
      preferredLearningStyle: profile.preferredLearningStyle as UserProfile["preferredLearningStyle"],
      preferredPlanIntensity: profile.preferredPlanIntensity as UserProfile["preferredPlanIntensity"],
      onboardingCompleted: profile.onboardingCompleted,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    } as UserProfile;

    const ai = getAIService();
    const generated = await ai.generateTrainingPlan({
      profile: aiProfile,
      focusAreas,
      context,
      period,
    });

    // Deactivate previous plans
    await db
      .update(trainingPlans)
      .set({ isActive: false })
      .where(and(eq(trainingPlans.userId, user.id), eq(trainingPlans.isActive, true)));

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (period === "weekly" ? 7 : 1));

    const [plan] = await db
      .insert(trainingPlans)
      .values({
        userId: user.id,
        title: generated.title,
        description: generated.description,
        period,
        startDate,
        endDate,
        focusAreas,
        skillLevel: profile.tennisLevel,
        intensity: profile.preferredPlanIntensity,
        isActive: true,
        generatedBy: "ai",
      })
      .returning();

    if (generated.sessions.length > 0) {
      await db.insert(trainingSessions).values(
        generated.sessions.map((s, i) => ({
          planId: plan.id,
          title: s.title,
          description: s.description ?? "",
          sessionType: s.sessionType as
            | "technical"
            | "footwork"
            | "conditioning"
            | "tactical"
            | "match_prep"
            | "recovery"
            | "drill"
            | "serve_practice",
          dayOfWeek: s.dayOfWeek,
          durationMinutes: s.durationMinutes,
          exercises: (s.exercises as unknown[]) ?? [],
          warmup: s.warmup ?? null,
          cooldown: s.cooldown ?? null,
          coachNotes: s.coachNotes ?? null,
          sortOrder: i,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      planId: plan.id,
      sessionsCreated: generated.sessions.length,
    });
  } catch (error) {
    console.error("Plan generation failed:", error);
    return NextResponse.json(
      {
        error: "Plan generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
